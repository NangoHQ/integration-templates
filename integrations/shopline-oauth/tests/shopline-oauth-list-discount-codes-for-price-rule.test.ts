import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-discount-codes-for-price-rule.js';

describe('shopline-oauth list-discount-codes-for-price-rule tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-discount-codes-for-price-rule",
      Model: "ActionOutput_shopline_oauth_listdiscountcodesforpricerule"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
