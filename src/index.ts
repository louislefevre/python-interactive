import { spawn, ChildProcess } from 'child_process';
import { Readable, Writable } from 'stream';
import { Mutex } from 'async-mutex';
import 'ts-replace-all';

export class PythonInteractive {
  private _pythonPath: string;
  private _pythonProcess: ChildProcess | null;
  private _mutex: Mutex;
  private _script: string;

  constructor(pythonPath?: string) {
    this._pythonPath = pythonPath ?? (process.platform === 'win32' ? 'python' : 'python3');
    this._pythonProcess = null;
    this._mutex = new Mutex();
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

  stop(): void {
    if (this._pythonProcess) {
      if (this._pythonProcess.stdin) this._pythonProcess.stdin.destroy();
      if (this._pythonProcess.stdout) this._pythonProcess.stdout.destroy();
      if (this._pythonProcess.stderr) this._pythonProcess.stderr.destroy();
      this._pythonProcess.kill();
      this._pythonProcess = null;
    }
  }

  async start(): Promise<string> {
    if (!this._pythonProcess) {
      this._pythonProcess = spawn(this._pythonPath, ['-i', '-u']);
      this._script = '';
    }
    return this.execute().catch((err) => err);
  }

  async restart(): Promise<string> {
    this.stop();
    return this.start();
  }

  async execute(command?: string): Promise<string> {
    return this._mutex.runExclusive(async () => {
      if (!this._pythonProcess) {
        throw new Error('Python process has not been started - call start() or restart() before executing commands.');
      }

      command = this.formatCommand(command);
      let promise = PythonInteractive.addListeners(this._pythonProcess.stdout, this._pythonProcess.stderr);
      PythonInteractive.sendInput(this._pythonProcess.stdin, command);

      return promise;
    });
  }

  private formatCommand(command: string | undefined): string {
    command = command ? command : '';
    this._script += command;

    command =
      'print("#CommandStart#")\n' + //
      `\n${command}\n` +
      '\nfrom sys import stderr as stderr_buffer; stderr_buffer.flush()' +
      '\nprint("#CommandEnd#")\n';

    return command;
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

      stderr.setEncoding('utf8');
      stderr.on('data', function (data) {
        data = data.replaceAll('>>>', '');
        data = data.replaceAll('...', '');
        errorData += data;
      });

      stdout.setEncoding('utf8');
      stdout.on('data', function (data) {
        let done = false;

        if (data.includes('#CommandStart#')) {
          data = data.replace('#CommandStart#', '');
        }
        if (data.includes('#CommandEnd#')) {
          data = data.replace('#CommandEnd#', '');
          done = true;
        }
        outputData += data;

        if (done) {
          stdout.removeAllListeners('data');
          stderr.removeAllListeners('data');
          if (errorData.trim()) {
            reject(errorData.trim());
          } else {
            resolve(outputData.trim());
          }
        }
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
