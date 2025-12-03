import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-channel-members.js';

describe('slack get-channel-members tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "get-channel-members",
      Model: "ActionOutput_slack_getchannelmembers"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 