/*
 * Unit tests should be named as:
 * [MethodUnderTest]_[Scenario]_[ExpectedResult]
 * Where:
 * - MethodUnderTest is the name of the method you are testing.
 * - Scenario is the condition under which you test the method.
 * - ExpectedResult is what you expect the method under test to do in the current scenario.
*/

import { PythonInteractive } from '../src/index'


let python: PythonInteractive; 
beforeEach(() => {
  python = new PythonInteractive();
});
afterEach(() => {
  python.stop();
});

describe('Initialise PythonInteractive', () => {
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

describe('Start & End Python Process', () => {
  describe('Start', () => {
    test('Start_AliveProcess_DoNothing', () => {
      python.start();
      let process = python.pythonProcess;
      python.start();
      expect(python.pythonProcess).toBe(process);
    });
  
    test('Start_AliveProcess_MaintainScript', () => {
      python.start();
      let script = python.script = 'text';
      python.start();
      expect(python.script).toBe(script);
    });
  
    test('Start_KilledProcess_SpawnProcess', () => {
      python.start();
      expect(python.pythonProcess).not.toBe(null);
    });
  
    test('Start_KilledProcess_ResetScript', () => {
      python.script = 'text';
      python.start();
      expect(python.script).toBe('');
    });
  
    test('Start_NewProcess_ReturnWelcomeMessage', async () => {
      let output = await python.start();
      expect(output).toMatch(/^Python 3./);
    });
  });
  
  describe('Stop', () => {  
    test('Stop_KilledProcess_DoNothing', () => {
      let process = python.pythonProcess;
      python.stop();
      expect(python.pythonProcess).toBe(process);
    });
  
    test('Stop_KilledProcess_MaintainScript', () => {
      let script = python.script = 'text';
      python.stop();
      expect(python.script).toBe(script);
    });
  
    test('Stop_AliveProcess_KillProcess', () => {
      python.start();
      python.stop();
      expect(python.pythonProcess).toBe(null);
    });
  
    test('Stop_AliveProcess_MaintainScript', () => {
      python.start();
      let script = python.script = 'text';
      python.stop();
      expect(python.script).toBe(script);
    });
  });
  
  describe('Restart', () => {
    test('Restart_KilledProcess_SpawnProcess', () => {
      python.restart();
      expect(python.pythonProcess).not.toBe(null);
    });
  
    test('Restart_KilledProcess_ResetScript', () => {
      python.script = 'text';
      python.restart();
      expect(python.script).toBe('');
    });
  
    test('Restart_AliveProcess_KillThenSpawnProcess', () => {
      python.start();
      let process = python.pythonProcess;
      python.restart();
      expect(python.pythonProcess).not.toBe(process);
    });
  
    test('Restart_AliveProcess_ResetScript', () => {
      python.start();
      python.script = 'text';
      python.restart();
      expect(python.script).toBe('');
    });
  
    test('Restart_NewProcess_ReturnWelcomeMessage', async () => {
      let output = await python.restart();
      expect(output).toMatch(/^Python 3./);
    });
  });
});

describe('Execute commands', () => {
  beforeEach(async () => {
    await python.start();
  });

  test('Execute_Empty_ReturnEmptyString', async () => {
    let output = await python.execute().then((data) => data);
    expect(output).toBe('');
  });

  test('Execute_StatementCommand_ReturnOutput', async () => {
    let output = await python.execute('print("Test")').then((data) => data);
    expect(output).toBe('Test');
  });

  test('Execute_ExpressionCommand_ReturnResult', async () => {
    let output = await python.execute('10 + 10').then((data) => data);
    expect(output).toBe('20');
  });

  test('Execute_NoOutputStatementCommand_ReturnEmptyString', async () => {
    let output = await python.execute('x = 10').then((data) => data);
    expect(output).toBe('');
  });

  test('Execute_MultipleStatementCommand_ReturnResult', async () => {
    let output = await python.execute('x = 10; print(x)').then((data) => data);
    expect(output).toBe('10');
  });

  test('Execute_SequentialCommands_ReturnResult', async () => {
    await python.execute('x = 10');
    let output = await python.execute('print(x)').then((data) => data);
    expect(output).toBe('10');
  });

  test('Execute_BlockCommand_ReturnResult', async () => {
    let input = `
    if True:
      x = 10
      print(x)

    `;
    let output = await python.execute(input).then((data) => data);
    expect(output).toBe('10');
  });
})
