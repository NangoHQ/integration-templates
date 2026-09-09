import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-manual-collections.js';

describe('shopline-oauth list-manual-collections tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-manual-collections",
      Model: "ActionOutput_shopline_oauth_listmanualcollections"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
