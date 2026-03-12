import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-deal.js';

describe('hubspot-knnj delete-deal tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "delete-deal",
      Model: "ActionOutput_hubspot_knnj_deletedeal"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
