import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-responses.js';

describe('typeform delete-responses tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "delete-responses",
      Model: "ActionOutput_typeform_deleteresponses"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
