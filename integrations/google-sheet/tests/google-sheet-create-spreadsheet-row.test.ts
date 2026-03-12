import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-spreadsheet-row.js';

describe('google-sheet create-spreadsheet-row tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "create-spreadsheet-row",
      Model: "ActionOutput_google_sheet_createspreadsheetrow"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
