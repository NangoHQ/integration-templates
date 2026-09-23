import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-inventory-items.js';

describe('shopline-oauth list-inventory-items tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-inventory-items",
      Model: "ActionOutput_shopline_oauth_listinventoryitems"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
