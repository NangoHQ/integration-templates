import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/leave-channel.js';

describe('slack leave-channel tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "leave-channel",
      Model: "ActionOutput_slack_leavechannel"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 