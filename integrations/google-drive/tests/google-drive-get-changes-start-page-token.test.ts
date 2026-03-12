import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-changes-start-page-token.js';

describe('google-drive get-changes-start-page-token tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-changes-start-page-token",
      Model: "ActionOutput_google_drive_getchangesstartpagetoken"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
