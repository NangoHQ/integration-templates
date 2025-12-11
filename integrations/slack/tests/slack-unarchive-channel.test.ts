import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unarchive-channel.js';

describe('slack unarchive-channel tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "unarchive-channel",
      Model: "ActionOutput_slack_unarchivechannel"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 