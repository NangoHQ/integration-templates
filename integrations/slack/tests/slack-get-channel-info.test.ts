import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-channel-info.js';

describe('slack get-channel-info tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-channel-info",
      Model: "ActionOutput_slack_getchannelinfo"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 