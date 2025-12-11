import { vi, expect, it, describe } from 'vitest';
import createAction from '../actions/get-upload-url.js';

describe('slack get-upload-url tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-upload-url",
      Model: "ActionOutput_slack_getuploadurl"
  });
  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();
      expect(response).toEqual(output);
  });
});
