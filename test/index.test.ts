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

  test('PythonPath_IsDefault_True', () => {
    expect(python.pythonPath).toBe('python' || 'python3');
  });

  test('PythonPath_IsDefault_False', () => {
    python = new PythonInteractive('path/to/python');
    expect(python.pythonPath).toBe('path/to/python');
  });

  test('PythonProcess_StartsEmpty_ReturnEmptyChildProcess', () => {
    expect(python.pythonProcess).toMatchObject({});
  });

  test('Script_StartsEmpty_ReturnEmptyString', () => {
    expect(python.script).toBe('');
  });
})
