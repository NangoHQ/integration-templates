import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-company.js';

describe('hubspot-knnj create-company tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "create-company",
      Model: "ActionOutput_hubspot_knnj_createcompany"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
