import { vi, expect, it, describe } from 'vitest';
import createAction from '../actions/get-file-info.js';

describe('slack get-file-info tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-file-info",
      Model: "ActionOutput_slack_getfileinfo"
  });
  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();
      expect(response).toEqual(output);
  });
});
