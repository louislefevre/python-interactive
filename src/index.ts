import { spawn, ChildProcess } from 'child_process';
import { Readable, Writable } from 'stream';
import dedent = require('dedent-js');

export class PythonInteractive {
  readonly pythonPath: string;
  pythonProcess: ChildProcess | null;
  script: string;

  constructor(pythonPath?: string) {
    this.pythonPath = pythonPath ?? 'python3';
    this.pythonProcess = null;
    this.script = '';
  }

  async start(): Promise<string> {
    if (!this.pythonProcess) {
      this.pythonProcess = spawn(this.pythonPath, ['-i', '-u']);
      if (this.pythonProcess.stdout && this.pythonProcess.stderr) {
        this.pythonProcess.stdout.setEncoding('utf8');
        this.pythonProcess.stderr.setEncoding('utf8');
      }
      this.script = '';
    }
    return this.execute().catch((err) => err);
  }

  stop(): void {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      if (this.pythonProcess.stdin) {
        this.pythonProcess.stdin.end();
      }
      this.pythonProcess = null;
    }
  }

  async restart(): Promise<string> {
    this.stop();
    return this.start();
  }

  async execute(command?: string): Promise<string> {
    if (!this.pythonProcess) {
      throw new Error('Python process has not been started - call start() or restart() before executing commands.');
    }

    command = command ? dedent(command) : '';
    this.script += command;
    command = '\nprint("#CommandStart#")\n' + command + '\nprint("#CommandEnd#")\n';

    const promise = PythonInteractive.addListeners(this.pythonProcess.stdout, this.pythonProcess.stderr);
    PythonInteractive.sendInput(this.pythonProcess.stdin, command);

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
