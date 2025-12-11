import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/join-channel.js';

describe('slack join-channel tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "join-channel",
      Model: "ActionOutput_slack_joinchannel"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 