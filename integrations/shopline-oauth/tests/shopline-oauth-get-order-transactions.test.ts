import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-order-transactions.js';

describe('shopline-oauth get-order-transactions tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-order-transactions",
      Model: "ActionOutput_shopline_oauth_getordertransactions"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
