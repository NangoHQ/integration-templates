import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-deals.js';

describe('hubspot-knnj search-deals tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "search-deals",
      Model: "ActionOutput_hubspot_knnj_searchdeals"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
