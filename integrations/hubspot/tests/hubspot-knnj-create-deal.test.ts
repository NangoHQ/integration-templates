import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-deal.js';

describe('hubspot-knnj create-deal tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "create-deal",
      Model: "ActionOutput_hubspot_knnj_createdeal"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
