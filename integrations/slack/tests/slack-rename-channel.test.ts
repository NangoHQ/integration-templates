import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/rename-channel.js';

describe('slack rename-channel tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "rename-channel",
      Model: "ActionOutput_slack_renamechannel"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 