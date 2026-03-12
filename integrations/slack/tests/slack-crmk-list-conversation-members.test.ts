import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-conversation-members.js';

describe('slack-crmk list-conversation-members tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-conversation-members",
      Model: "ActionOutput_slack_crmk_listconversationmembers"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
