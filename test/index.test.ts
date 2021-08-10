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
import dedent = require('dedent-js');

function runWithPlatform(platform: string, callback: () => void): void {
  let originalPlatform = process.platform;
  Object.defineProperty(process, 'platform', { value: platform });
  callback();
  Object.defineProperty(process, 'platform', { value: originalPlatform });
}

let python: PythonInteractive;
beforeEach(() => {
  python = new PythonInteractive();
});
afterEach(() => {
  python.stop();
});

describe('Initialise PythonInteractive', () => {
  test('PythonPath_IsLinuxDefault_EqualDefaultPath', () => {
    runWithPlatform('linux', () => {
      python = new PythonInteractive();
      expect(python.pythonPath).toBe('python3');
    });
  });

  test('PythonPath_IsWindowsDefault_EqualDefaultPath', () => {
    runWithPlatform('win32', () => {
      python = new PythonInteractive();
      expect(python.pythonPath).toBe('python');
    });
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
      let input = dedent`
        x = 10
        if x > 5:
          x = x * 2

        print(x)
        `;
      let output = await python.execute(input);
      expect(output).toBe('20');
    });

    test('Execute_ForCommand_ReturnResult', async () => {
      let input = dedent`
        for i in range(3):
          print(i)
        `;
      let output = await python.execute(input);
      expect(output).toBe('0\n1\n2');
    });

    test('Execute_NestedForCommand_ReturnResult', async () => {
      let input = dedent`
        for i in range(3):
          for j in range(3):
            print(i, j)
        `;
      let output = await python.execute(input);
      expect(output).toBe('0 0\n0 1\n0 2\n1 0\n1 1\n1 2\n2 0\n2 1\n2 2');
    });

    test('Execute_ForEachCommand_ReturnResult', async () => {
      let input = dedent`
        for i in [0, 1, 2]:
          print(i)
        `;
      let output = await python.execute(input);
      expect(output).toBe('0\n1\n2');
    });

    test('Execute_WhileCommand_ReturnResult', async () => {
      let input = dedent`
        i = 0
        while i < 3:
          print(i)
          i += 1
        `;
      let output = await python.execute(input);
      expect(output).toBe('0\n1\n2');
    });

    test('Execute_FunctionCommand_ReturnResult', async () => {
      let input = dedent`
        def test(x):
          return x + 10

        print(test(10))
        `;
      let output = await python.execute(input);
      expect(output).toBe('20');
    });

    test('Execute_ClassCommand_ReturnResult', async () => {
      let input = dedent`
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

    test('Execute_InstancedMultipleStatementCommand_ReturnResult', async () => {
      let python1 = new PythonInteractive();
      let python2 = new PythonInteractive();
      await python1.start();
      await python2.start();
      await python1.execute('x = 10');
      await python2.execute('x = 20');
      let output = await python1.execute('print(x)');
      python1.stop();
      python2.stop();
      expect(output).toBe('10');
    });
  });

  describe('Invalid Commands', () => {
    test('Execute_InvalidNameCommand_ReturnNameError', async () => {
      let output = await python.execute('print(x)').catch((err) => err);
      expect(output).toBe(errors.NAME_ERROR);
    });

    test('Execute_InvalidIndentedCommand_ReturnIndentationError', async () => {
      let output = await python.execute('  print(x)').catch((err) => err);
      expect(output).toBe(errors.INDENT_ERROR);
    });

    test('Execute_InvalidImportCommand_ReturnImportError', async () => {
      let output = await python.execute('import fake_module').catch((err) => err);
      expect(output).toBe(errors.IMPORT_ERROR);
    });

    test('Execute_InvalidSyntaxCommand_ReturnSyntaxError', async () => {
      let output = await python.execute('10 = 10').catch((err) => err);
      expect(output).toBe(errors.SYNTAX_ERROR);
    });

    test('Execute_InvalidLoopCommand_ReturnTypeError', async () => {
      let input = dedent`
        for i in [0, 1, "2"]:
          print(i*i)
        `;
      let output = await python.execute(input).catch((err) => err);
      expect(output).toBe(errors.TYPE_ERROR);
    });

    test('Execute_InvalidInstancedNameCommand_ReturnsNameError', async () => {
      let python1 = new PythonInteractive();
      let python2 = new PythonInteractive();
      await python1.start();
      await python2.start();
      await python1.execute('x = 10');
      let output = await python2.execute('print(x)').catch((err) => err);
      python1.stop();
      python2.stop();
      expect(output).toBe(errors.NAME_ERROR);
    });
  });

  describe('Async Commands', () => {
    test('Execute_ParallelStatementCommands_ReturnOutputs', async () => {
      let outputs = await Promise.all([
        python.execute('print(1)'),
        python.execute('print(2)'),
        python.execute('print(3)'),
      ]);
      expect(outputs).toEqual(['1', '2', '3']);
    });

    test('Execute_ParallelExpressionCommands_ReturnOutputs', async () => {
      let outputs = await Promise.all([
        python.execute('10 + 10'),
        python.execute('10 * 10'),
        python.execute('10 / 10'),
      ]);
      expect(outputs).toEqual(['20', '100', '1.0']);
    });

    test('Execute_ParallelSequentialCommands_ReturnOutputs', async () => {
      let outputs = await Promise.all([
        python.execute('x = 10'),
        python.execute('print(x)'),
        python.execute('x = 20'),
        python.execute('print(x)'),
      ]);
      expect(outputs).toEqual(['', '10', '', '20']);
    });

    test('Execute_ParallelLoopCommands_ReturnOutputs', async () => {
      let outputs = await Promise.all([
        python.execute('for i in range(0, 3): print(i)'),
        python.execute('for i in range(3, 6): print(i)'),
        python.execute('for i in range(6, 9): print(i)'),
      ]);
      expect(outputs).toEqual(['0\n1\n2', '3\n4\n5', '6\n7\n8']);
    });

    test('Execute_ParallelInvalidNameCommands_ReturnNameErrors', async () => {
      let outputs = await Promise.all([
        python.execute('print(x)').catch((err) => err),
        python.execute('print(x)').catch((err) => err),
      ]);
      expect(outputs).toEqual([errors.NAME_ERROR, errors.NAME_ERROR]);
    });

    test('Execute_ParallelInvalidSyntaxCommands_ReturnSyntaxErrors', async () => {
      let outputs = await Promise.all([
        python.execute('10 = 10').catch((err) => err),
        python.execute('10 = 10').catch((err) => err),
      ]);
      expect(outputs).toEqual([errors.SYNTAX_ERROR, errors.SYNTAX_ERROR]);
    });

    test('Execute_ParallelInvalidLoopCommands_ReturnTypeErrors', async () => {
      let input = dedent`
        for i in [0, 1, "2"]:
          print(i*i)
        `;
      let outputs = await Promise.all([
        python.execute(input).catch((err) => err),
        python.execute(input).catch((err) => err),
      ]);
      expect(outputs).toEqual([errors.TYPE_ERROR, errors.TYPE_ERROR]);
    });

    test('Execute_ParallelMixedCommands_ReturnErrorsAndOutputs', async () => {
      let outputs = await Promise.all([
        python.execute('print(x)').catch((err) => err),
        python.execute('x = 10'),
        python.execute('import fake_module').catch((err) => err),
        python.execute('print(x)'),
      ]);
      expect(outputs).toEqual([errors.NAME_ERROR, '', errors.IMPORT_ERROR, '10']);
    });

    test('Execute_ParallelInstancedMixedCommands_ReturnsErrorsAndOutputs', async () => {
      let python1 = new PythonInteractive();
      let python2 = new PythonInteractive();
      await python1.start();
      await python2.start();
      let outputs = await Promise.all([
        python1.execute('x = 10'),
        python2.execute('print("text")'),
        python1.execute('print(x)'),
        python2.execute('print(x)').catch((err) => err),
      ]);
      python1.stop();
      python2.stop();
      expect(outputs).toEqual(['', 'text', '10', errors.NAME_ERROR]);
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

describe('Helper Functions', () => {
  describe('Python Version', () => {
    test('PythonVersion_ValidPath_ReturnsVersion', async () => {
      let version = await python.pythonVersion();
      expect(version).toMatch(/^Python (\d+\.\d+\.\d+)/);
    });

    test('PythonVersion_InvalidPath_ThrowsError', async () => {
      python.pythonPath = '/invalid/python/path';
      await expect(python.pythonVersion()).rejects.toThrow(/^Command failed:/);
    });
  });

  describe('Python Build', () => {
    test('PythonBuild_ValidPath_ReturnsBuild', async () => {
      let version = await python.pythonBuild();
      expect(version).toMatch(/^Python (\d+\.\d+\.\d+) \((.*)\)/);
    });

    test('PythonBuild_InvalidPath_ThrowsError', async () => {
      python.pythonPath = '/invalid/python/path';
      await expect(python.pythonBuild()).rejects.toThrow(/^Command failed:/);
    });
  });
});
