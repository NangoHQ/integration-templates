import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/set-channel-topic.js';

describe('slack set-channel-topic tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "set-channel-topic",
      Model: "ActionOutput_slack_setchanneltopic"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 