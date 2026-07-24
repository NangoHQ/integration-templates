import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-theme.js';

describe('typeform delete-theme tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "delete-theme",
      Model: "ActionOutput_typeform_deletetheme"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
