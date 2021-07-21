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
    let process = python.pythonProcess;
    let script = python.script;
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

  test('Start_NewProcess_ReturnWelcomeMessage', async () => {
    python.stop();
    let output = await python.start();

    expect(output).toMatch(/^Python 3./);
  });

  test('Stop_KilledProcess_DoNothing', () => {
    python.stop();
    let process = python.pythonProcess;
    let script = python.script;
    python.stop();
    expect(python.pythonProcess).toBe(process);
    expect(python.script).toBe(script);
  });

  test('Stop_AliveProcess_KillProcess', () => {
    let script = python.script;
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
    let process = python.pythonProcess;
    let script = python.script;
    python.restart();
    expect(python.pythonProcess).not.toBe(process);
    expect(python.script).not.toBe(script);
  });

  test('Restart_NewProcess_ReturnWelcomeMessage', async () => {
    let output = await python.restart();

    expect(output).toMatch(/^Python 3./);
  });
});

describe('Execute commands', () => {
  let python: PythonInteractive; 
  beforeEach(async () => {
    python = new PythonInteractive();
    await python.start();
  });
  afterEach(() => {
    python.stop();
  });

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

  // TODO: Fix this test - it will sometimes (seemingly non-deterministically) fail
  test('Execute_BlockCommand_ReturnResult', async () => {
    expect.assertions(1);
    let input = `
    if True:
      x = 10
      print(x)

    `;
    let output = await python.execute(input);
    expect(output).toBe('10');
  });
})
