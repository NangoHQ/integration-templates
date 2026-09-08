import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-price-rules.js';

describe('shopline-oauth list-price-rules tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-price-rules",
      Model: "ActionOutput_shopline_oauth_listpricerules"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
