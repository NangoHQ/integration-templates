import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-order-risk.js';

describe('shopline-oauth remove-order-risk tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "remove-order-risk",
      Model: "ActionOutput_shopline_oauth_removeorderrisk"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
