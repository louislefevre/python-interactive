/*
 * Unit tests should be named as:
 * [MethodUnderTest]_[Scenario]_[ExpectedResult]
 * Where:
 * - MethodUnderTest is the name of the method you are testing.
 * - Scenario is the condition under which you test the method.
 * - ExpectedResult is what you expect the method under test to do in the current scenario.
*/

import { PythonInteractive } from '../src/index'


describe('Initialise PythonInteractive', () => {
  let python: PythonInteractive; 
  beforeEach(() => {
    python = new PythonInteractive();
  });

  test('PythonPath_IsDefault_EqualDefaultPath', () => {
    expect(python.pythonPath).toBe('python' || 'python3');
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
})

describe('Start and stop Python process', () => {
  let python: PythonInteractive; 
  beforeEach(() => {
    python = new PythonInteractive();
    python.start();
    python.script = 'text';
  });
  afterEach(() => {
    python.stop();
  });

  test('Start_AliveProcess_DoNothing', () => {
    const process = python.pythonProcess;
    const script = python.script;
    python.start();
    expect(python.pythonProcess).toBe(process);
    expect(python.script).toBe(script);
  });

  test('Start_KilledProcess_SpawnProcess', () => {
    python.stop();
    python.start();
    expect(python.pythonProcess).not.toBe(null);
    expect(python.script).toBe('');
  });

  test('Stop_KilledProcess_DoNothing', () => {
    python.stop();
    const process = python.pythonProcess;
    const script = python.script;
    python.stop();
    expect(python.pythonProcess).toBe(process);
    expect(python.script).toBe(script);
  });

  test('Stop_AliveProcess_KillProcess', () => {
    const script = python.script;
    python.stop();
    expect(python.pythonProcess).toBe(null);
    expect(python.script).toBe(script);
  });

  test('Restart_KilledProcess_SpawnProcess', () => {
    python.stop();
    python.restart();
    expect(python.pythonProcess).not.toBe(null);
    expect(python.script).toBe('');
  });

  test('Restart_AliveProcess_KillThenSpawnProcess', () => {
    const process = python.pythonProcess;
    const script = python.script;
    python.restart();
    expect(python.pythonProcess).not.toBe(process);
    expect(python.script).not.toBe(script);
  });
});
