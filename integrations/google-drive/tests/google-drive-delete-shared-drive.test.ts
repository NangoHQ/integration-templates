import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-shared-drive.js';

describe('google-drive delete-shared-drive tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "delete-shared-drive",
      Model: "ActionOutput_google_drive_deleteshareddrive"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
