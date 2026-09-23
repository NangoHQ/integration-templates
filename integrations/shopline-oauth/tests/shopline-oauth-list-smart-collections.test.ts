import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-smart-collections.js';

describe('shopline-oauth list-smart-collections tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-smart-collections",
      Model: "ActionOutput_shopline_oauth_listsmartcollections"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
