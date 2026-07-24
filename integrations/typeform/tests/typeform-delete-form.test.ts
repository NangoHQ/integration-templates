import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-form.js';

describe('typeform delete-form tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "delete-form",
      Model: "ActionOutput_typeform_deleteform"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
