import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-presence.js';

describe('slack get-user-presence tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-user-presence",
      Model: "ActionOutput_slack_getuserpresence"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
