import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-values.js';

describe('google-sheet get-values tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-values",
      Model: "ActionOutput_google_sheet_getvalues"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
