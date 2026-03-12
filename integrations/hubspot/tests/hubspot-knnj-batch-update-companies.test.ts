import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-update-companies.js';

describe('hubspot-knnj batch-update-companies tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "batch-update-companies",
      Model: "ActionOutput_hubspot_knnj_batchupdatecompanies"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
