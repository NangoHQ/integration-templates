import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-dataset-rows.js';

describe('microsoft-power-bi-oauth2-cc delete-dataset-rows tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "delete-dataset-rows",
      Model: "ActionOutput_microsoft_power_bi_oauth2_cc_deletedatasetrows"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
