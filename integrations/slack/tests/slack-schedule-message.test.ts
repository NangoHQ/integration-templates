import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/schedule-message.js';

describe('slack schedule-message tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "schedule-message",
      Model: "ActionOutput_slack_schedulemessage"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 