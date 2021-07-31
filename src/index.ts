import { spawn, ChildProcess } from 'child_process';
import { Readable, Writable } from 'stream';
import dedent = require('dedent-js');

export class PythonInteractive {
  private _pythonPath: string;
  private _pythonProcess: ChildProcess | null;
  private _script: string;

  constructor(pythonPath?: string) {
    this._pythonPath = pythonPath ?? 'python3';
    this._pythonProcess = null;
    this._script = '';
  }

  get pythonPath(): string {
    return this._pythonPath;
  }

  set pythonPath(path: string) {
    if (this._pythonProcess) {
      throw new Error('Cannot set pythonPath while process is running');
    }
    this._pythonPath = path;
  }

  get pythonProcess(): ChildProcess | null {
    return this._pythonProcess;
  }

  get script(): string {
    return this._script.trimStart();
  }

  async start(): Promise<string> {
    if (!this._pythonProcess) {
      this._pythonProcess = spawn(this._pythonPath, ['-i', '-u']);
      this._script = '';
    }
    return this.execute().catch((err) => err);
  }

  stop(): void {
    if (this._pythonProcess) {
      if (this._pythonProcess.stdin) this._pythonProcess.stdin.destroy();
      if (this._pythonProcess.stdout) this._pythonProcess.stdout.destroy();
      if (this._pythonProcess.stderr) this._pythonProcess.stderr.destroy();
      this._pythonProcess.kill();
      this._pythonProcess = null;
    }
  }

  async restart(): Promise<string> {
    this.stop();
    return this.start();
  }

  async execute(command?: string): Promise<string> {
    if (!this._pythonProcess) {
      throw new Error('Python process has not been started - call start() or restart() before executing commands.');
    }

    command = command ? dedent(command) : '';
    this._script += command;
    command = '\nprint("#CommandStart#")\n' + command + '\nprint("#CommandEnd#")\n';

    const promise = PythonInteractive.addListeners(this._pythonProcess.stdout, this._pythonProcess.stderr);
    PythonInteractive.sendInput(this._pythonProcess.stdin, command);

    return promise;
  }

  private static addListeners(stdout: Readable | null, stderr: Readable | null): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!stdout) {
        throw new Error('Failed to read from standard output stream');
      } else if (!stderr) {
        throw new Error('Failed to read from standard error stream');
      }

      let outputData = '';
      let errorData = '';

      stdout.setEncoding('utf8');
      stdout.on('data', function (data) {
        let done = false;

        if (data.match(/#CommandStart#/)) {
          data = data.replace(/#CommandStart#/, '');
        }
        if (data.match(/#CommandEnd#/)) {
          data = data.replace(/#CommandEnd#/, '');
          done = true;
        }
        outputData += data;

        if (done) {
          stdout.removeAllListeners();
          stderr.removeAllListeners();
          if (errorData.trim()) {
            reject(errorData.trim());
          } else {
            resolve(outputData.trim());
          }
        }
      });

      stderr.setEncoding('utf8');
      stderr.on('data', function (data) {
        if (data.includes('>>>')) {
          data = data.replace(/>>>/g, '');
        }
        if (data.includes('...')) {
          data = data.replace(/.../g, '');
        }

        // When the input is a code block, the result will sometimes (seemingly non-deterministicly)
        // be a single period. This is a workaround to prevent it being added to the output.
        if (data.trim() === '.') {
          data = '';
        }

        errorData += data;
      });
    });
  }

  private static sendInput(stdin: Writable | null, command: string): void {
    if (!stdin) {
      throw new Error('Failed to write to standard input stream');
    }
    stdin.write(command);
  }
}
