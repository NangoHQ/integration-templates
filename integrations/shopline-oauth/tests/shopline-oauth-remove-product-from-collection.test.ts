import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-product-from-collection.js';

describe('shopline-oauth remove-product-from-collection tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "remove-product-from-collection",
      Model: "ActionOutput_shopline_oauth_removeproductfromcollection"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
