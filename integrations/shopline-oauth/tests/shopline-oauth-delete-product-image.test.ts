import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-product-image.js';

describe('shopline-oauth delete-product-image tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "delete-product-image",
      Model: "ActionOutput_shopline_oauth_deleteproductimage"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
