import { spawn, exec, ChildProcess, SpawnOptionsWithoutStdio } from 'child_process';
import { Readable, Writable } from 'stream';
import { Mutex } from 'async-mutex';
import { promisify } from 'util';

const execute = promisify(exec);

/**
 * Interactive Python interpreter for executing commands within Node.js
 */
export class PythonInteractive {
  private _pythonPath: string;
  private _pythonProcess: ChildProcess | null;
  private _mutex: Mutex;
  private _history: Array<string>;
  private _lastCommand: string;

  /**
   * Initialises a new PythonInteractive instance.
   *
   * Each instance of PythonInteractive uses its own process, separate from all other instances.
   * Note that the Python process is not spawned until the start() method is called.
   *
   * @param {string} pythonPath Path to the Python interpreter. Uses the systems default Python
   * interpreter if not provided.
   */
  constructor(pythonPath?: string) {
    this._pythonPath = pythonPath ?? (process.platform === 'win32' ? 'python' : 'python3');
    this._pythonProcess = null;
    this._mutex = new Mutex();
    this._history = new Array<string>();
    this._lastCommand = '';
  }

  /**
   * Set the path for the Python interpreter.
   *
   * @param {string} path Path of the Python executable.
   */
  set pythonPath(path: string) {
    if (this._pythonProcess) {
      throw new Error('Cannot set Python path while process is running');
    }
    this._pythonPath = path;
  }

  /**
   * Get the path for the Python interpreter.
   *
   * @return {string} Returns the path for the current Python executable.
   */
  get pythonPath(): string {
    return this._pythonPath;
  }

  /**
   * Get the process for the Python interpreter.
   *
   * @return {ChildProcess | null} Returns the current Python ChildProcess if a process is
   * currently running, null if not.
   */
  get pythonProcess(): ChildProcess | null {
    return this._pythonProcess;
  }

  /**
   * Get the history log containing all of the commands that have been executed.
   *
   * This property is reset whenever a new process is spawned with start().
   *
   * @return {Array<string>} Returns an array of strings containing all executed commands.
   */
  get history(): Array<string> {
    return this._history;
  }

  /**
   * Get the last Python command that was executed.
   *
   * This property is reset whenever a new process is spawned with start().
   *
   * @return {string} Returns a string containing the last command.
   */
  get lastCommand(): string {
    return this._lastCommand;
  }

  /**
   * Spawns a new Python process.
   *
   * A new process is spawned using the Python interpreter as defined by the pythonPath property,
   * though only if no process is currently running. To kill the current process, call stop().
   * Note that the script property is reset when calling this method.
   *
   * The Python interpreter is always spawned with the -i, -u, and -q flags.
   *
   * @param {string[]} args Arguments to pass to the Python interpreter.
   * @param {SpawnOptionsWithoutStdio} options Options to pass to the spawned process.
   */
  start(args: string[] = [], options?: SpawnOptionsWithoutStdio): void {
    if (!this._pythonProcess) {
      let initCode = 'import sys; sys.ps1 = ""; sys.ps2 = ""';
      this._pythonProcess = spawn(this._pythonPath, ['-i', '-u', '-q', '-c', initCode].concat(args), options);
      this._history = new Array<string>();
      this._lastCommand = '';
    }
  }

  /**
   * Kills the current Python process.
   *
   * The process is killed if there is one currently running. To spawn a new process, call the
   * start() method.
   */
  stop(): void {
    if (this._pythonProcess) {
      if (this._pythonProcess.stdin) this._pythonProcess.stdin.destroy();
      if (this._pythonProcess.stdout) this._pythonProcess.stdout.destroy();
      if (this._pythonProcess.stderr) this._pythonProcess.stderr.destroy();
      this._pythonProcess.kill();
      this._pythonProcess = null;
    }
  }

  /**
   * Kills the current Python process and spawns a new one.
   *
   * This method acts as a wrapper for executing stop() and then start(). It will only kill a
   * process if there is a process currently running. If not, then only a new process is spawned.
   * Note that the script property is reset when calling this method.
   *
   * @param {string[]} args Arguments to pass to the Python interpreter.
   * @param {SpawnOptionsWithoutStdio} options Options to pass to the spawned process.
   */
  restart(args?: string[], options?: SpawnOptionsWithoutStdio): void {
    this.stop();
    this.start(args, options);
  }

  /**
   * Returns the version of the Python interpreter.
   *
   * @return {Promise<string>} Returns a Promise with the Python interpreter version.
   */
  async pythonVersion(): Promise<string> {
    return execute(this._pythonPath + ' -V').then((data) => data.stdout.trim());
  }

  /**
   * Returns information about the Python interpreter build.
   *
   * This method only works with Python 3.6 or greater.
   *
   * @return {Promise<string>} Returns a Promise with the Python interpreter build information.
   */
  async pythonBuild(): Promise<string> {
    return execute(this._pythonPath + ' -VV').then((data) => data.stdout.trim());
  }

  /**
   * Executes a string of Python code and returns the output.
   *
   * Before commands can be executed, the Python process must be spawned using the start() method.
   *
   * @param {string} command Python command to be executed. May be a single command or
   * multiple commands separated by line breaks. If undefined, an empty line is executed.
   * @return {Promise<string>} Returns a Promise which will resolve if the command executed successfully,
   * or reject if an error occurred.
   * @throws {Error} Throws an Error if the Python process has not been started.
   */
  async execute(command?: string): Promise<string> {
    return this._mutex.runExclusive(async () => {
      if (!this._pythonProcess) {
        throw new Error('Python process has not been started - call start() or restart() before executing commands');
      }

      command = this.formatCommand(command);
      let promise = PythonInteractive.addListeners(this._pythonProcess.stdout, this._pythonProcess.stderr);
      PythonInteractive.sendInput(this._pythonProcess.stdin, command);

      return promise;
    });
  }

  private formatCommand(command: string | undefined): string {
    if (command) {
      this._history.push(command);
      this._lastCommand = command;
    } else {
      command = '';
    }

    command = `${command}\n\n` + 'print("#StdoutEnd#")\n' + 'print("#StderrEnd#", file=sys.stderr)\n';

    return command;
  }

  private static async addListeners(stdout: Readable | null, stderr: Readable | null): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!stdout) {
        throw new Error('Failed to read from standard output stream');
      } else if (!stderr) {
        throw new Error('Failed to read from standard error stream');
      }

      let stdoutData = '';
      let stderrData = '';
      let stdoutDone = false;
      let stderrDone = false;

      let removeListeners = function () {
        stdout.removeAllListeners();
        stderr.removeAllListeners();
      };

      let done = function () {
        if (stdoutDone && stderrDone) {
          removeListeners();
          if (stderrData.trim()) {
            reject(stderrData.trim());
          } else {
            resolve(stdoutData.trim());
          }
        }
      };

      // Standard output streams
      stdout.setEncoding('utf8');
      stdout.on('data', function (data) {
        stdoutData += data;
        if (stdoutData.includes('#StdoutEnd#')) {
          stdoutData = stdoutData.replace(/#StdoutEnd#/g, '');
          stdoutDone = true;
          done();
        }
      });

      stdout.on('end', () => {
        removeListeners();
        reject(new Error('Standard output stream ended unexpectedly'));
      });

      stdout.on('error', (err: Error) => {
        removeListeners();
        reject(err);
      });

      // Standard error streams
      stderr.setEncoding('utf8');
      stderr.on('data', function (data) {
        stderrData += data;
        if (stderrData.includes('#StderrEnd#')) {
          stderrData = stderrData.replace(/#StderrEnd#/g, '');
          stderrDone = true;
          done();
        }
      });

      stderr.on('end', () => {
        removeListeners();
        reject(new Error('Standard error stream ended unexpectedly'));
      });

      stderr.on('error', (err: Error) => {
        removeListeners();
        reject(err);
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
