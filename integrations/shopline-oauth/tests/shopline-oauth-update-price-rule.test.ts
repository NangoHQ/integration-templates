import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-price-rule.js';

describe('shopline-oauth update-price-rule tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "update-price-rule",
      Model: "ActionOutput_shopline_oauth_updatepricerule"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
