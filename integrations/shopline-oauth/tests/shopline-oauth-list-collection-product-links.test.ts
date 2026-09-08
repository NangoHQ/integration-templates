import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-collection-product-links.js';

describe('shopline-oauth list-collection-product-links tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-collection-product-links",
      Model: "ActionOutput_shopline_oauth_listcollectionproductlinks"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
