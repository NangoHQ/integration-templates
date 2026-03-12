import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-changes.js';

describe('google-drive list-changes tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-changes",
      Model: "ActionOutput_google_drive_listchanges"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
