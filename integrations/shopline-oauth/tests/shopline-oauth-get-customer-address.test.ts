import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-customer-address.js';

describe('shopline-oauth get-customer-address tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-customer-address",
      Model: "ActionOutput_shopline_oauth_getcustomeraddress"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
