import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/patch-form.js';

describe('typeform patch-form tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "patch-form",
      Model: "ActionOutput_typeform_patchform"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
