import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-smart-collection.js';

describe('shopline-oauth delete-smart-collection tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "delete-smart-collection",
      Model: "ActionOutput_shopline_oauth_deletesmartcollection"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
