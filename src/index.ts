import { spawn, ChildProcess } from 'child_process';
import { platform } from 'os';
import { Readable, Writable } from 'stream';
import dedent = require('dedent-js');

const defaultPythonPath = platform() === 'win32' ? 'python3' : 'python';

export class PythonInteractive {
  readonly pythonPath: string;
  pythonProcess: ChildProcess | null;
  script: string;

  constructor(pythonPath?: string) {
    this.pythonPath = pythonPath ?? defaultPythonPath;
    this.pythonProcess = null;
    this.script = '';
  }

  start(): Promise<string> {
    if (!this.pythonProcess) {
      this.pythonProcess = spawn(this.pythonPath, ['-i', '-u']);
      if (this.pythonProcess.stdout && this.pythonProcess.stderr) {
        this.pythonProcess.stdout.setEncoding('utf8');
        this.pythonProcess.stderr.setEncoding('utf8');
      }
      this.script = '';
    }
    return this.execute();
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

  restart(): Promise<string> {
    this.stop();
    return this.start();
  }

  async execute(command?: string, callback?: (err: string | null, data: string | null) => void): Promise<string> {
    if (!this.pythonProcess) {
      throw new Error('Python process has not been started - call start() or restart() before executing commands.');
    }

    command = command ? dedent(command) : '';
    this.script += command;
    command = '\nprint("#CommandStart#")\n' + command + '\nprint("#CommandEnd#")\n';

    const promise = PythonInteractive.addListeners(this.pythonProcess.stdout, this.pythonProcess.stderr);
    PythonInteractive.sendInput(this.pythonProcess.stdin, command);

    return promise
      .then((data) => callback !== undefined ? callback(null, data.trim()) : data.trim())
      .catch((err) => callback !== undefined ? callback(err.trim(), null) : err.trim());
  }

  private static addListeners(stdout: Readable | null, stderr: Readable | null): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!stdout) {
        throw new Error('Failed to read from standard output stream');
      } if (!stderr) {
        throw new Error('Failed to read from standard error stream');
      }

      let outputData = '';
      let errorData = '';
  
      stdout.on('data', function(data) {
        let done = false;
  
        if (data.match(/#CommandStart#/)) {
          data = data.replace(/#CommandStart#/, '');
        } if (data.match(/#CommandEnd#/)) {
          data = data.replace(/#CommandEnd#/, '');
          done = true;
        }
        outputData += data;
  
        if (done) {
          stdout.removeAllListeners();
          stderr.removeAllListeners();
          if (errorData.trim()) {
            reject(errorData);
          } else {
            resolve(outputData);
          }
        }
      });
  
      stderr.on('data', function(data) {
        if (data.includes('>>>')) {
          data = data.replace(/>>>/g, '');
        } if (data.includes('...')) {
          data = data.replace(/.../g, '');
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
