import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/create-task.js';

describe('hubspot create-task tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "create-task",
      Model: "CreateUpdateTaskOutput"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await runAction(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
