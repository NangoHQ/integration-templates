import { vi, expect, it, describe } from 'vitest';
import createAction from '../actions/delete-file.js';

describe('slack delete-file tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "delete-file",
      Model: "ActionOutput_slack_deletefile"
  });
  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();
      expect(response).toEqual(output);
  });
});
