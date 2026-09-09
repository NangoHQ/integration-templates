import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-discount-code-by-code.js';

describe('shopline-oauth get-discount-code-by-code tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-discount-code-by-code",
      Model: "ActionOutput_shopline_oauth_getdiscountcodebycode"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
