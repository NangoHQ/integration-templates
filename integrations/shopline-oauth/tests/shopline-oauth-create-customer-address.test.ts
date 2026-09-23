import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-customer-address.js';

describe('shopline-oauth create-customer-address tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "create-customer-address",
      Model: "ActionOutput_shopline_oauth_createcustomeraddress"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
