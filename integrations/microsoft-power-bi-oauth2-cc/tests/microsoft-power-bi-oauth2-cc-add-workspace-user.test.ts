import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-workspace-user.js';

describe('microsoft-power-bi-oauth2-cc add-workspace-user tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "add-workspace-user",
      Model: "ActionOutput_microsoft_power_bi_oauth2_cc_addworkspaceuser"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
