import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/adjust-inventory-level.js';

describe('shopline-oauth adjust-inventory-level tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "adjust-inventory-level",
      Model: "ActionOutput_shopline_oauth_adjustinventorylevel"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
