import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-dataset-users.js';

describe('microsoft-power-bi-oauth2-cc list-dataset-users tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-dataset-users",
      Model: "ActionOutput_microsoft_power_bi_oauth2_cc_listdatasetusers"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
