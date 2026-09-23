import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-product-to-collection.js';

describe('shopline-oauth add-product-to-collection tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "add-product-to-collection",
      Model: "ActionOutput_shopline_oauth_addproducttocollection"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
