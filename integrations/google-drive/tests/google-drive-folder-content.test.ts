import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/folder-content.js';

describe('google-drive folder-content tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "folder-content",
      Model: "FolderContent"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await runAction(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
