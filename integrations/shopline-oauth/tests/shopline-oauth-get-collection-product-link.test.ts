import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-collection-product-link.js';

describe('shopline-oauth get-collection-product-link tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-collection-product-link",
      Model: "ActionOutput_shopline_oauth_getcollectionproductlink"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
