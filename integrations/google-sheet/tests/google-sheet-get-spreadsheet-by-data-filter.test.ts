import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-spreadsheet-by-data-filter.js';

describe('google-sheet get-spreadsheet-by-data-filter tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-spreadsheet-by-data-filter",
      Model: "ActionOutput_google_sheet_getspreadsheetbydatafilter"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
