import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-theme.js';

describe('typeform create-theme tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "create-theme",
      Model: "ActionOutput_typeform_createtheme"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
