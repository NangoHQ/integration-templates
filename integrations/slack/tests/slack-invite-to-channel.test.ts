import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/invite-to-channel.js';

describe('slack invite-to-channel tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "invite-to-channel",
      Model: "ActionOutput_slack_invitetochannel"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
