import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-update-spreadsheet.js';

describe('google-sheet batch-update-spreadsheet tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "batch-update-spreadsheet",
      Model: "ActionOutput_google_sheet_batchupdatespreadsheet"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
