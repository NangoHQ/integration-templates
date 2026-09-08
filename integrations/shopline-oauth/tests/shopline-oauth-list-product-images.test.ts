import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-product-images.js';

describe('shopline-oauth list-product-images tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-product-images",
      Model: "ActionOutput_shopline_oauth_listproductimages"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
