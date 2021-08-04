# Python Interactive
[![CI Status](https://img.shields.io/github/workflow/status/louislefevre/python-interactive/Node.js%20CI)](https://github.com/louislefevre/python-interactive/actions/workflows/node.js.yml)
[![Coverage Status](https://img.shields.io/coveralls/github/louislefevre/python-interactive)](https://coveralls.io/github/louislefevre/python-interactive?branch=master)

Interactive Python interpreter for executing commands within Node.js via promises.

To use this package, you must have Python in your PATH.

## Installation
Install the package with npm:  
`npm install python-interactive`

Import the package:
```js
import {PythonInteractive} from 'python-interactive';
```

Or use requires:
```js
let {PythonInteractive} = require('python-interactive');
```

## Quick Start
```js
```

## Usage
### Initialising PythonInteractive
```js
// Use default Python executable
let python = new PythonInteractive();

// Use specific Python executable
let python = new PythonInteractive('python3.9');

// Use specific Python executable with path
let python = new PythonInteractive('/path/to/python');
```
Create a new instance of `PythonInteractive`. By default, the interpreter will be in interactive mode and is called using the `python3` command on Unix systems or `python` on Windows.

Each instance of `PythonInteractive` maintains a single isolated Python interpreter process. This allows you to have multiple Python processes running simultaneously whilst ensuring that they do not interfere with one another.

Optionally, you can initialise the Python interpreter using a specific Python executable. This can be done by passing in a path or command to the constructor.

### Starting a Python Process
```js
// Start Python process
(async () => {
  await python.start();
})();

// Start Python process and output the welcome message
(async () => {
  let welcomeMsg = await python.start();
  console.log(welcomeMsg);
})();
```
To start the Python process, use the `start()` method. If this is not done, attempting to execute commands will result in an error being thrown. This method will not do anything if a process is already running. A promise is returned that will resolve once the process has been started.

The promise being returned also has the added benefit of including the welcome message given by the Python interpreter when starting up. For example, the output of the above code would be:
```
Python 3.9.6 (default, Jun 30 2021, 10:22:16) 
[GCC 11.1.0] on linux
Type "help", "copyright", "credits" or "license" for more information.
```

### Stopping a Python Process
```js
python.stop();
```
To stop the Python process, use the `stop()` method. This will destroy all stdio streams, kill the Python process, and set it to null. This method will not do anything if a process is not running. Nothing is returned by this method.

### Restarting a Python Process
```js
(async () => {
  await python.restart();
})();
```
To restart the Python process, use the `restart()` method. This method acts as a wrapper for calling `stop()` and then `start()`, and provides no additional functionality.

### Executing Commands
```js
(async () => {
  // Example 1: execute an empty command
  await python.execute();
  
  // Example 2: execute a command and ignore its output
  await python.execute('x = 10');
  
  // Example 3: execute a command and retrieve its output
  let result = await python.execute('print(x)');
  
  // Example 4: execute a command and handle its output
  await python.execute('print(y)')
    .then((data) => {
      console.log(`Executed successfully with output:\n ${data}`);
    })
    .catch((err) => {
      console.log(`Failed to execute with error:\n ${err}`);
    })
})();
```
Executing commands can be done in multiple ways, but should always be done using async/await functionality as the result is returned as a promise. Above are some examples of how commands can be executed:
- Example 1 will execute an empty command and is the same as `await python.execute('');`.
- Example 2 will execute a command but do nothing with its output. However, in this example the `x` variable will still be assigned the value 10, and can be referenced in future command executions.
- Example 3 will execute a command and then save its output to the `result` variable. Since `x` was previously assigned the value 10, executing the command `print(x)` will give the output `10`. This value is then saved to `result`.
- Example 4 will execute a command and then handle the output by attaching callbacks to the returned promise. If the command executes without an error, the `then()` callback will handle the output. If the command returned an error, the `catch()` callback will handle the output. In this example, the `catch()` callback will be executed (as `y` has not been declared) and will output the following:
  ```
  Failed to execute with error:
  Traceback (most recent call last):
    File "<stdin>", line 1, in <module>
  NameError: name 'y' is not defined
  ```

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
