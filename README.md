# Python Interactive
[![CI Status](https://img.shields.io/github/workflow/status/louislefevre/python-interactive/Node.js%20CI)](https://github.com/louislefevre/python-interactive/actions/workflows/node.js.yml)
[![Coverage Status](https://img.shields.io/coveralls/github/louislefevre/python-interactive)](https://coveralls.io/github/louislefevre/python-interactive?branch=master)
[![Node](https://img.shields.io/node/v/python-interactive)](https://nodejs.org/en/)

Interactive Python interpreter for executing commands within Node.js.

This module provides a means of using the Python interactive interpreter programmatically from within Node.js, allowing commands to be executed from code as if they were being run in a terminal.

Commands are executed asynchronously through the use of `async/await`, with results being returned via a Promise. This allows for interactions to be handled differently depending on whether the Python code ran successfully or returned an error.

## Example
```ts
let {PythonInteractive} = require('python-interactive');
let python = new PythonInteractive();

let loopCmd = `
count = 0
while pi > 0:
  pi = pi / 2
  count += 1

print(count)
`;

// Start the Python process
python.start();

await (async () => {
  // Import packages and ignore any output
  await python.execute('from math import pi');

  // Print value of 'pi' and store the output
  let pi = await python.execute('print(pi)');

  // Execute multiline loop command and handle its output via Promise callbacks
  await python.execute(loopCmd)
    .then((data) => {
      // If the Python code executed successfully
      console.log(`${pi} was halved ${data} times before being less than or equal to 0`);
    })
    .catch((err) => {
      // If the Python code executed with an error
      console.log(`Failed to execute due to error:\n ${err}`);
    })
})();

// Stop the Python process
python.stop();
```
```
3.141592653589793 was halved 1077 times before being less than or equal to 0
```

## Usage
### Installing
[![NPM](https://nodei.co/npm/python-interactive.png?compact=true)](https://www.npmjs.com/package/python-interactive)

### Loading the Module
```ts
// ES6 module syntax
import {PythonInteractive} from 'python-interactive';

// CommonJS module syntax
let {PythonInteractive} = require('python-interactive');
```
Use ES6 `import` or CommonJS `require` to use the PythonInteractive class. 

### Creating an Instance
```ts
// Use default Python executable
let python = new PythonInteractive();

// Use specific Python executable
let python = new PythonInteractive('python3.9');

// Use specific Python executable with path
let python = new PythonInteractive('/path/to/python');
```
Create a new instance of `PythonInteractive`. By default, the Python interpreter will be spawned in interactive mode and is called using the `python3` command on Unix systems or `python` on Windows. You must have Python in your PATH for this to work.

Each instance of `PythonInteractive` maintains a single isolated Python interpreter process. This allows you to have multiple Python processes running simultaneously whilst ensuring that they do not interfere with one another.

Optionally, you can initialise the Python interpreter using a specific Python executable. This can be done by passing in a path or command to the constructor.

### Starting a Python Process
```ts
python.start();
```
To start the Python process, call the `start()` method. Attempting to execute commands before calling `start()` will result in an error being thrown. This method will not do anything if a process is already running.

### Stopping a Python Process
```ts
python.stop();
```
To stop the Python process, call the `stop()` method. This will destroy all stdio streams, kill the Python process, then set it to null. When `stop()` is run, commands can no longer be executed until `start()` is called again. This method will not do anything if a process is not running.

### Restarting a Python Process
```ts
python.restart();
```
To restart the Python process, call the `restart()` method. This method acts as a wrapper for calling `stop()` and then `start()`, and provides no additional functionality.

### Executing Commands
Commands can be executed in multiple ways, but should always be done using `async/await` functionality as the result is returned via a Promise. Below are some examples of how commands can be executed. For more examples, take a look at the [test suite](test/).

#### Ignore Output
```ts
(async () => {
  await python.execute('x = 10');
})();
```
This will execute a command but do nothing with its output. However, in this example the `x` variable will still be assigned the value 10, and can be referenced in future command executions. Note that if a command is executed in this manner and causes an error, the error will be thrown (this can be handled using `try/catch` or the `catch()` function).

#### Retrieve Output
```ts
(async () => {
  let result = await python.execute('print(x)');
})();
```
This will execute a command and then save its output to the `result` variable. Since `x` was previously assigned the value 10, executing the command `print(x)` will give the output `10`. This value is then saved to `result`. Note that if a command is executed in this manner and causes an error, the error will be thrown (this can be handled using `try/catch` or the `catch()` function).

#### Handle Output
```ts
(async () => {
  await python.execute('print(y)')
    .then((data) => {
      console.log(`Executed successfully with output:\n ${data}`);
    })
    .catch((err) => {
      console.log(`Failed to execute with error:\n ${err}`);
    })
})();
```
This will execute a command and then handle the output by attaching callbacks to the returned Promise. If the command executes without an error, the `then()` callback will handle the output. If the command returned an error, the `catch()` callback will handle the output. In this example, the `catch()` callback will be executed (as `y` has not been declared) and output the following:
```
Failed to execute with error:
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
NameError: name 'y' is not defined
```

#### Multiline Command
```ts
let input = `
i = 0
while i < 3:
  print(i)
  i += 1

print(i*i)
`;

(async () => {
  let result = await python.execute(input);
  console.log(`"${result}"`);
})();
```
It is also possible to execute multiline commands, with any output being concatenated into a single string. For example, the above code will return the output:
```
"0
1
2
9"
```
Multiline constructs (e.g. loops, functions, classes) must be closed before the code can be executed - you cannot execute separate parts of a construct individually.

### Interpreter Rules
Note that you must adhere to the rules of the Python interpreter when in interactive mode; indentation and line breaks must be used correctly to represent where constructs end. For example, this is valid Python code:
```python
for i in range(a):
  print(i)

print(i * i)
```
This is not valid Python code and will return an `IndentationError`:
```python
for i in range(a):
  print(i)
print(i * i)
```

## API
### `PythonInteractive(pythonPath)`
Initialises a new instance of `PythonInteractive`.

Each instance of `PythonInteractive` uses its own process, separate from all other instances. Note that the Python process is not spawned until the `start()` method is called.

#### Parameters
- `pythonPath` (string): path to the Python interpreter. Defaults to `python3` on Unix systems or `python` on Windows.

#### Properties
- `pythonPath` (string): path to the Python interpreter.
- `process` (ChildProcess): the current Python interpreter process.
- `history` (Array\<string>): all commands that have been executed for the current process.
- `lastCommand` (string): the last command that was executed for the current process.

### `start()`
Spawns a new Python process.

A new process is spawned using the Python interpreter as defined by the `pythonPath` property, though only if no process is currently running. To kill the current process, call `stop()`. Note that the `history` property is reset when calling this method.

The Python interpreter is always spawned with the -i, -u, and -q flags.

#### Parameters
- `args` (string[]): Arguments to pass to the Python interpreter.
- `options` (Object): Options to pass to the spawned process.

### `stop()`
Kills the current Python process.

If no process is running, this method will do nothing. To spawn a new process, call the `start()` method.

### `restart()`
Kills the current Python process and spawns a new one.

This method acts as a wrapper for executing `stop()` and then `start()`. It will only kill a process if there is a process currently running. If not, then only a new process is spawned. Note that the `history` property is reset when calling this method.

#### Parameters
- `args` (string[]): Arguments to pass to the Python interpreter.
- `options` (Object): Options to pass to the spawned process.

### `pythonVersion()`
Returns the version of the Python interpreter via a Promise.

### `pythonBuild()`
Returns information about the Python interpreter build via a Promise.

This method only works with Python 3.6 or greater.

### `execute(command)`
Executes a string of Python code and returns the output.

Before commands can be executed, the Python process must be spawned using the start() method. An error will be thrown if the Python process has not been started.

Returns a Promise which will resolve with the output if the command executed successfully, or reject with an error message if the command failed.

#### Parameters
- `command` (string): Python command to be executed. May be a single command or multiple commands separated by line breaks. If undefined, an empty line is executed.
