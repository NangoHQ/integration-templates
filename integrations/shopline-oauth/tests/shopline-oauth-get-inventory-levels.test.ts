import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-inventory-levels.js';

describe('shopline-oauth get-inventory-levels tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-inventory-levels",
      Model: "ActionOutput_shopline_oauth_getinventorylevels"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
