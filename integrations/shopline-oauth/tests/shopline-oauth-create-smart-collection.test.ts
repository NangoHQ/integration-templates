import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-smart-collection.js';

describe('shopline-oauth create-smart-collection tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "create-smart-collection",
      Model: "ActionOutput_shopline_oauth_createsmartcollection"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
