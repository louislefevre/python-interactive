/*
 * Unit tests should be named as:
 * [MethodUnderTest]_[Scenario]_[ExpectedResult]
 * Where:
 * - MethodUnderTest is the name of the method you are testing.
 * - Scenario is the condition under which you test the method.
 * - ExpectedResult is what you expect the method under test to do in the current scenario.
 */

import * as errors from './errors';
import { PythonInteractive } from '../src/index';

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
      let output = await python.execute('print(x)').catch((err) => err);
      expect(output).toBe(errors.NAME_ERROR);
    });

    test('Execute_InvalidIndentedCommand_ReturnIndentationError', async () => {
      let output = await python.execute('  print(x)').catch((err) => err);
      try {
        // The output for the CI pipeline is different and needs a unique string.
        expect(output).toBe(errors.INDENT_ERROR_CI);
      } catch {
        expect(output).toBe(errors.INDENT_ERROR);
      }
    });

    test('Execute_InvalidImportCommand_ReturnImportError', async () => {
      let output = await python.execute('import fake_module').catch((err) => err);
      expect(output).toBe(errors.IMPORT_ERROR);
    });

    test('Execute_InvalidSyntaxCommand_ReturnSyntaxError', async () => {
      let output = await python.execute('10 = 10').catch((err) => err);
      try {
        // The output for the CI pipeline is different and needs a unique string.
        expect(output).toBe(errors.SYNTAX_ERROR_CI);
      } catch {
        expect(output).toBe(errors.SYNTAX_ERROR);
      }
    });

    test('Execute_InvalidLoopCommand_ReturnTypeError', async () => {
      let input = `
        for i in [0, 1, "2"]:
          print(i*i)
        `;
      let output = await python.execute(input).catch((err) => err);
      expect(output).toBe(errors.TYPE_ERROR);
    });
  });

  describe('Async Commands', () => {
    test('Execute_ParallelStatementCommands_ReturnOutput', async () => {
      let results = await Promise.all([
        python.execute('print(1)'),
        python.execute('print(2)'),
        python.execute('print(3)'),
      ]);
      expect(results).toEqual(['1', '2', '3']);
    });

    test('Execute_ParallelExpressionCommands_ReturnOutput', async () => {
      let results = await Promise.all([
        python.execute('10 + 10'),
        python.execute('10 * 10'),
        python.execute('10 / 10'),
      ]);
      expect(results).toEqual(['20', '100', '1.0']);
    });

    test('Execute_ParallelSequentialCommands_ReturnOutput', async () => {
      let results = await Promise.all([
        python.execute('x = 10'),
        python.execute('print(x)'),
        python.execute('x = 20'),
        python.execute('print(x)'),
      ]);
      expect(results).toEqual(['', '10', '', '20']);
    });

    test('Execute_ParallelLoopCommands_ReturnOutput', async () => {
      let results = await Promise.all([
        python.execute('for i in range(0, 3): print(i)'),
        python.execute('for i in range(3, 6): print(i)'),
        python.execute('for i in range(6, 9): print(i)'),
      ]);
      expect(results).toEqual(['0\n1\n2', '3\n4\n5', '6\n7\n8']);
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
