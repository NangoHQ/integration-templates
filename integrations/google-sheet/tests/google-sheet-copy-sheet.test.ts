import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/copy-sheet.js';

describe('google-sheet copy-sheet tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "copy-sheet",
      Model: "ActionOutput_google_sheet_copysheet"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
