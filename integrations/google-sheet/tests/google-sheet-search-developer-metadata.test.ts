import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-developer-metadata.js';

describe('google-sheet search-developer-metadata tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "search-developer-metadata",
      Model: "ActionOutput_google_sheet_searchdevelopermetadata"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
