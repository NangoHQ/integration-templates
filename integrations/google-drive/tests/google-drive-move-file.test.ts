import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/move-file.js';

describe('google-drive move-file tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "move-file",
      Model: "ActionOutput_google_drive_movefile"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
