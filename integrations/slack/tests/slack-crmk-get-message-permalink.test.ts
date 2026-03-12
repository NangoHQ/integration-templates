import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-message-permalink.js';

describe('slack-crmk get-message-permalink tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-message-permalink",
      Model: "ActionOutput_slack_crmk_getmessagepermalink"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
