import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-dataset-table-schema.js';

describe('microsoft-power-bi-oauth2-cc update-dataset-table-schema tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "update-dataset-table-schema",
      Model: "ActionOutput_microsoft_power_bi_oauth2_cc_updatedatasettableschema"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
