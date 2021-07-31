/*
 * Unit tests should be named as:
 * [MethodUnderTest]_[Scenario]_[ExpectedResult]
 * Where:
 * - MethodUnderTest is the name of the method you are testing.
 * - Scenario is the condition under which you test the method.
 * - ExpectedResult is what you expect the method under test to do in the current scenario.
 */

import { PythonInteractive } from '../src/index';
import dedent = require('dedent-js');

let python: PythonInteractive;
beforeEach(() => {
  python = new PythonInteractive();
});
afterEach(() => {
  python.stop();
});

describe('Initialise PythonInteractive', () => {
  test('PythonPath_IsDefault_EqualDefaultPath', () => {
    expect(python.pythonPath).toBe('python3');
  });

  test('PythonPath_IsNotDefault_EqualSetPath', () => {
    python = new PythonInteractive('path/to/python');
    expect(python.pythonPath).toBe('path/to/python');
  });

  test('PythonProcess_StartsEmpty_ReturnEmptyChildProcess', () => {
    expect(python.pythonProcess).toBe(null);
  });

  test('Script_StartsEmpty_ReturnEmptyString', () => {
    expect(python.script).toBe('');
  });
});

describe('Activate/Deactivate Python Process', () => {
  describe('Start', () => {
    test('Start_AliveProcess_DoNothing', () => {
      python.start();
      let process = python.pythonProcess;
      python.start();
      expect(python.pythonProcess).toBe(process);
    });

    test('Start_AliveProcess_MaintainScript', async () => {
      await python.start();
      await python.execute('print("text")');
      python.start();
      expect(python.script).toBe('print("text")');
    });

    test('Start_KilledProcess_SpawnProcess', () => {
      python.start();
      expect(python.pythonProcess).not.toBe(null);
    });

    test('Start_KilledProcess_ResetScript', async () => {
      await python.start();
      await python.execute('print("text")');
      python.stop();
      python.start();
      expect(python.script).toBe('');
    });

    test('Start_NewProcess_ReturnWelcomeMessage', async () => {
      let output = await python.start();
      expect(output).toMatch(/^Python 3./);
    });

    test('Start_SetPythonPath_ThrowError', () => {
      expect(() => {
        python.start();
        python.pythonPath = 'path/to/python';
      }).toThrow(Error);
    });
  });

  describe('Stop', () => {
    test('Stop_KilledProcess_DoNothing', () => {
      let process = python.pythonProcess;
      python.stop();
      expect(python.pythonProcess).toBe(process);
    });

    test('Stop_KilledProcess_MaintainScript', async () => {
      await python.start();
      await python.execute('print("text")');
      python.stop();
      expect(python.script).toBe('print("text")');
    });

    test('Stop_AliveProcess_KillProcess', () => {
      python.start();
      python.stop();
      expect(python.pythonProcess).toBe(null);
    });

    test('Stop_AliveProcess_MaintainScript', async () => {
      await python.start();
      await python.execute('print("text")');
      python.stop();
      expect(python.script).toBe('print("text")');
    });

    test('Stop_SetPythonPath_SetPath', () => {
      python.start();
      python.stop();
      python.pythonPath = 'path/to/python';
      expect(python.pythonPath).toBe('path/to/python');
    });
  });

  describe('Restart', () => {
    test('Restart_KilledProcess_SpawnProcess', () => {
      python.restart();
      expect(python.pythonProcess).not.toBe(null);
    });

    test('Restart_KilledProcess_ResetScript', async () => {
      await python.start();
      await python.execute('print("text")');
      python.restart();
      expect(python.script).toBe('');
    });

    test('Restart_AliveProcess_KillThenSpawnProcess', () => {
      python.start();
      let process = python.pythonProcess;
      python.restart();
      expect(python.pythonProcess).not.toBe(process);
    });

    test('Restart_AliveProcess_ResetScript', async () => {
      await python.start();
      await python.execute('print("text")');
      python.restart();
      expect(python.script).toBe('');
    });

    test('Restart_NewProcess_ReturnWelcomeMessage', async () => {
      let output = await python.restart();
      expect(output).toMatch(/^Python 3./);
    });
  });
});

describe('Execute Python Commands', () => {
  beforeEach(async () => {
    await python.start();
  });

  describe('Valid Commands', () => {
    test('Execute_Empty_ReturnEmptyString', async () => {
      let output = await python.execute();
      expect(output).toBe('');
    });

    test('Execute_StatementCommand_ReturnOutput', async () => {
      let output = await python.execute('print("Test")');
      expect(output).toBe('Test');
    });

    test('Execute_ExpressionCommand_ReturnResult', async () => {
      let output = await python.execute('10 + 10');
      expect(output).toBe('20');
    });

    test('Execute_NoOutputStatementCommand_ReturnEmptyString', async () => {
      let output = await python.execute('x = 10');
      expect(output).toBe('');
    });

    test('Execute_MultipleStatementCommand_ReturnResult', async () => {
      let output = await python.execute('x = 10; print(x)');
      expect(output).toBe('10');
    });

    test('Execute_SequentialCommands_ReturnResult', async () => {
      await python.execute('x = 10');
      let output = await python.execute('print(x)');
      expect(output).toBe('10');
    });

    test('Execute_IfCommand_ReturnResult', async () => {
      let input = `
      x = 10
      if x > 5:
        x = x * 2

      print(x)
      `;
      let output = await python.execute(input);
      expect(output).toBe('20');
    });

    test('Execute_ForCommand_ReturnResult', async () => {
      let input = `
        for i in range(3):
          print(i)

        `;
      let output = await python.execute(input);
      expect(output).toBe('0\n1\n2');
    });

    test('Execute_NestedForCommand_ReturnResult', async () => {
      let input = `
        for i in range(3):
          for j in range(3):
            print(i, j)

        `;
      let output = await python.execute(input);
      expect(output).toBe('0 0\n0 1\n0 2\n1 0\n1 1\n1 2\n2 0\n2 1\n2 2');
    });

    test('Execute_ForEachCommand_ReturnResult', async () => {
      let input = `
        for i in [0, 1, 2]:
          print(i)

        `;
      let output = await python.execute(input);
      expect(output).toBe('0\n1\n2');
    });

    test('Execute_WhileCommand_ReturnResult', async () => {
      let input = `
        i = 0
        while i < 3:
          print(i)
          i += 1

        `;
      let output = await python.execute(input);
      expect(output).toBe('0\n1\n2');
    });

    test('Execute_FunctionCommand_ReturnResult', async () => {
      let input = `
        def test(x):
          return x + 10

        print(test(10))
        `;
      let output = await python.execute(input);
      expect(output).toBe('20');
    });

    test('Execute_ClassCommand_ReturnResult', async () => {
      let input = `
        class Test:
          def __init__(self, x):
            self.x = x
          def test(self):
            return self.x + 10

        print(Test(10).test())
        `;
      let output = await python.execute(input);
      expect(output).toBe('20');
    });
  });

  describe('Invalid Commands', () => {
    test('Execute_InvalidNameCommand_ReturnNameError', async () => {
      const NAME_ERROR = `Traceback (most recent call last):
          File "<stdin>", line 1, in <module>
        NameError: name 'x' is not defined`;
      let output = await python.execute('print(x)').catch((err) => err);
      expect(output).toBe(dedent(NAME_ERROR));
    });

    test('Execute_InvalidIndentedCommand_ReturnIndentationError', async () => {
      // The output for the CI pipeline is different and needs a unique string.
      const INDENT_ERROR_CI = `File "<stdin>", line 1
            print(x)
            ^
        IndentationError: unexpected indent`;

      const INDENT_ERROR = `File "<stdin>", line 1
          print(x)
      IndentationError: unexpected indent`;

      let output = await python.execute('  print(x)').catch((err) => err);
      try {
        expect(output).toBe(dedent(INDENT_ERROR_CI));
      } catch {
        expect(output).toBe(dedent(INDENT_ERROR));
      }
    });

    test('Execute_InvalidImportCommand_ReturnImportError', async () => {
      const IMPORT_ERROR = `Traceback (most recent call last):
          File "<stdin>", line 1, in <module>
        ModuleNotFoundError: No module named 'fake_module'`;
      let output = await python.execute('import fake_module').catch((err) => err);
      expect(output).toBe(dedent(IMPORT_ERROR));
    });

    test('Execute_InvalidSyntaxCommand_ReturnSyntaxError', async () => {
      // The output for the CI pipeline is different and needs a unique string.
      const SYNTAX_ERROR_CI = `File "<stdin>", line 1
        SyntaxError: cannot assign to literal`;

      const SYNTAX_ERROR = `File "<stdin>", line 1
            10 = 10
            ^
        SyntaxError: cannot assign to literal`;

      let output = await python.execute('10 = 10').catch((err) => err);
      try {
        expect(output).toBe(dedent(SYNTAX_ERROR_CI));
      } catch {
        expect(output).toBe(dedent(SYNTAX_ERROR));
      }
    });

    test('Execute_InvalidLoopCommand_ReturnTypeError', async () => {
      const TYPE_ERROR = `Traceback (most recent call last):
          File "<stdin>", line 2, in <module>
        TypeError: can't multiply sequence by non-int of type 'str'`;
      let input = `
        for i in [0, 1, "2"]:
          print(i*i)

        `;
      let output = await python.execute(input).catch((err) => err);
      expect(output).toBe(dedent(TYPE_ERROR));
    });
  });

  describe('Null Streams', () => {
    test('Execute_NullProcess_ThrowError', async () => {
      python.stop();
      await expect(python.execute()).rejects.toThrow(Error);
    });

    test('Execute_NullStdin_ThrowError', async () => {
      if (python.pythonProcess) {
        python.pythonProcess.stdin = null;
      }
      await expect(python.execute()).rejects.toThrow(Error);
    });

    test('Execute_NullStdout_ThrowError', async () => {
      if (python.pythonProcess) {
        python.pythonProcess.stdout = null;
      }
      await expect(python.execute()).rejects.toThrow(Error);
    });

    test('Execute_NullStderr_ThrowError', async () => {
      if (python.pythonProcess) {
        python.pythonProcess.stderr = null;
      }
      await expect(python.execute()).rejects.toThrow(Error);
    });
  });
});
