import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-conversation-history.js';

describe('slack get-conversation-history tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "get-conversation-history",
      Model: "ActionOutput_slack_getconversationhistory"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 