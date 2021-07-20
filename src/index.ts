import { spawn, ChildProcess } from 'child_process';
import { platform } from 'os';

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

  start() {
    if (!this.pythonProcess) {
      this.pythonProcess = spawn(this.pythonPath, ['-i', '-u']);
      if (this.pythonProcess.stdout && this.pythonProcess.stderr) {
        this.pythonProcess.stdout.setEncoding('utf8');
        this.pythonProcess.stderr.setEncoding('utf8');
      }
      this.script = '';
    }
  }

  stop() {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      if (this.pythonProcess.stdin) {
        this.pythonProcess.stdin.end();
      }
      this.pythonProcess = null;
    }
  }

  restart() {
    this.stop();
    this.start();
  }
}
