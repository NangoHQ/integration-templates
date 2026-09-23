import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/bulk-add-products-to-collection.js';

describe('shopline-oauth bulk-add-products-to-collection tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "bulk-add-products-to-collection",
      Model: "ActionOutput_shopline_oauth_bulkaddproductstocollection"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
