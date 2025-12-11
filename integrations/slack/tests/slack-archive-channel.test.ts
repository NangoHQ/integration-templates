import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/archive-channel.js';

describe('slack archive-channel tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "archive-channel",
      Model: "ActionOutput_slack_archivechannel"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 