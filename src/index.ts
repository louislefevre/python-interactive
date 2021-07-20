import { ChildProcess } from 'child_process';
import { platform } from 'os';

const defaultPythonPath = platform() === 'win32' ? 'python3' : 'python';

export class PythonInteractive {
  readonly pythonPath: string;
  pythonProcess: ChildProcess;
  script: string;

  constructor(pythonPath?: string) {
    this.pythonPath = pythonPath ?? defaultPythonPath;
    this.pythonProcess = <ChildProcess>{};
    this.script = '';
  }
}
