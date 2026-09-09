import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-customer-address.js';

describe('shopline-oauth update-customer-address tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "update-customer-address",
      Model: "ActionOutput_shopline_oauth_updatecustomeraddress"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
