import { vi, expect, it, describe } from 'vitest';
import createAction from '../actions/complete-file-upload.js';

describe('slack complete-file-upload tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "complete-file-upload",
      Model: "ActionOutput_slack_completefileupload"
  });
  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();
      expect(response).toEqual(output);
  });
});
