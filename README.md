# Python Interactive
[![CI Status](https://img.shields.io/github/workflow/status/louislefevre/python-interactive/Node.js%20CI)](https://github.com/louislefevre/python-interactive/actions/workflows/node.js.yml)
[![Coverage Status](https://img.shields.io/coveralls/github/louislefevre/python-interactive)](https://coveralls.io/github/louislefevre/python-interactive?branch=master)

Interactive Python interpreter for executing commands within Node.js.

This package provides a means of using the Python interactive interpreter programmatically from within Node.js, allowing commands to be executed from code as if they were being run in a terminal. 

Commands are executed asynchronously through the use of `async/await`, with results being returned via a Promise. This allows for interactions to be handled differently depending on whether the Python code ran successfully or returned an error.

## Example
```js
let {PythonInteractive} = require('python-interactive');
let python = new PythonInteractive();

let loopCmd = `
count = 0
while pi > 0:
  pi = pi / 2
  count += 1

print(count)
`;

await (async () => {
  // Start the Python process and log the welcome message
  let welcomeMsg = await python.start();
  console.log(welcomeMsg);

  // Import packages and ignore any output (will throw error if code fails to execute)
  await python.execute('from math import pi');

  // Print value of 'pi' and store the output
  let pi = await python.execute('print(pi)');

  // Execute multiline loop command and handle its output via Promise callbacks
  await python.execute(loopCmd)
    .then((data) => {
      // If the Python code executed successfully
      console.log(`${pi} was halved ${data} times before being less than 0`);
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
Python 3.9.6 (default, Jun 30 2021, 10:22:16) 
[GCC 11.1.0] on linux
Type "help", "copyright", "credits" or "license" for more information.

3.141592653589793 was halved 1077 times before being less than 0
```

## Usage
### Importing PythonInteractive
```js
import {PythonInteractive} from 'python-interactive';
let {PythonInteractive} = require('python-interactive');
```
Use `import` or `require` to use the PythonInteractive class.

### Initialising PythonInteractive
```js
// Use default Python executable
let python = new PythonInteractive();

// Use specific Python executable
let python = new PythonInteractive('python3.9');

// Use specific Python executable with path
let python = new PythonInteractive('/path/to/python');
```
Create a new instance of `PythonInteractive`. By default, the interpreter will be in interactive mode and is called using the `python3` command on Unix systems or `python` on Windows. You must have Python in your PATH for this to work.

Each instance of `PythonInteractive` maintains a single isolated Python interpreter process. This allows you to have multiple Python processes running simultaneously whilst ensuring that they do not interfere with one another.

Optionally, you can initialise the Python interpreter using a specific Python executable. This can be done by passing in a path or command to the constructor.

### Starting a Python Process
```js
// Start Python process
(async () => {
  await python.start();
})();

// Start Python process and log the welcome message
(async () => {
  let welcomeMsg = await python.start();
  console.log(welcomeMsg);
})();
```
To start the Python process, use the `start()` method. If this is not done, attempting to execute commands will result in an error being thrown. This method will not do anything if a process is already running. A Promise is returned that will resolve once the process has been started.

The Promise being returned also has the added benefit of including the welcome message given by the Python interpreter when starting up. For example, the output of the above code would be:
```
Python 3.9.6 (default, Jun 30 2021, 10:22:16) 
[GCC 11.1.0] on linux
Type "help", "copyright", "credits" or "license" for more information.
```

### Stopping a Python Process
```js
python.stop();
```
To stop the Python process, use the `stop()` method. This will destroy all stdio streams, kill the Python process, then set it to null. When `stop()` is run, commands can no longer be executed until `start()` is called again. This method will not do anything if a process is not running.

### Restarting a Python Process
```js
(async () => {
  await python.restart();
})();
```
To restart the Python process, use the `restart()` method. This method acts as a wrapper for calling `stop()` and then `start()`, and provides no additional functionality.

### Executing Commands
Commands can be executed in multiple ways, but should always be done using `async/await` functionality as the result is returned as a Promise. Below are some examples of how commands can be executed. For more examples, take a look at the [test suite](test/).

#### Execute command and ignore output:
```js
(async () => {
  await python.execute('x = 10');
})();
```
This will execute a command but do nothing with its output. However, in this example the `x` variable will still be assigned the value 10, and can be referenced in future command executions. Note that if a command is executed in this manner and causes an error, the error will be thrown (this can be handled using `try/catch` or the `catch()` function).

#### Execute command and retrieve output:
```js
(async () => {
  let result = await python.execute('print(x)');
})();
```
This will execute a command and then save its output to the `result` variable. Since `x` was previously assigned the value 10, executing the command `print(x)` will give the output `10`. This value is then saved to `result`. Note that if a command is executed in this manner and causes an error, the error will be thrown (this can be handled using `try/catch` or the `catch()` function).

#### Execute command and handle output:
```js
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
This will execute a command and then handle the output by attaching callbacks to the returned Promise. If the command executes without an error, the `then()` callback will handle the output. If the command returned an error, the `catch()` callback will handle the output. In this example, the `catch()` callback will be executed (as `y` has not been declared) and will output the following:
```
Failed to execute with error:
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
NameError: name 'y' is not defined
```

#### Execute multiline command:
```js
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
It is also possible to execute multiline commands, with any output being concatenated into a single string. For example, the above code will give the output:
```
"0
1
2
9"
```
Multiline constructs (e.g. loops, functions, classes) must be closed before the code can be executed - you cannot execute individual parts of a construct separately.

### Python Interactive Rules
Note that you must adhere to the rules of the Python interpreter when in interactive mode; indentation and line breaks must be used correctly to represent where constructs end.  For example, this is valid Python code:
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
