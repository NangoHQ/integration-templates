import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-smart-collection.js';

describe('shopline-oauth update-smart-collection tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "update-smart-collection",
      Model: "ActionOutput_shopline_oauth_updatesmartcollection"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
