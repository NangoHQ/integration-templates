import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/leave-conversation.js';

describe('slack-crmk leave-conversation tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "leave-conversation",
      Model: "ActionOutput_slack_crmk_leaveconversation"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
