import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-scheduled-messages.js';

describe('slack list-scheduled-messages tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "list-scheduled-messages",
      Model: "ActionOutput_slack_listscheduledmessages"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 