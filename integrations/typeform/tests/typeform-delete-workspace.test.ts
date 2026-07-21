import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-workspace.js';

describe('typeform delete-workspace tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "delete-workspace",
      Model: "ActionOutput_typeform_deleteworkspace"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
