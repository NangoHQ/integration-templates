import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/copy-file.js';

describe('google-drive copy-file tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "copy-file",
      Model: "ActionOutput_google_drive_copyfile"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
