import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-from-channel.js';

describe('slack remove-from-channel tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "remove-from-channel",
      Model: "ActionOutput_slack_removefromchannel"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 