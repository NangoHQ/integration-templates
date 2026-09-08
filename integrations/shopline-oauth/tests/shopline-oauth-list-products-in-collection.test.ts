import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-products-in-collection.js';

describe('shopline-oauth list-products-in-collection tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-products-in-collection",
      Model: "ActionOutput_shopline_oauth_listproductsincollection"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
