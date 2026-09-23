import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-customer-count.js';

describe('shopline-oauth get-customer-count tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-customer-count",
      Model: "ActionOutput_shopline_oauth_getcustomercount"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
