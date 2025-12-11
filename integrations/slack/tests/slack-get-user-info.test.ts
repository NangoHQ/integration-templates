import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-info.js';

describe('slack get-user-info tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-user-info",
      Model: "ActionOutput_slack_getuserinfo"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
