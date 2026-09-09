import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-order-count.js';

describe('shopline-oauth get-order-count tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-order-count",
      Model: "ActionOutput_shopline_oauth_getordercount"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
