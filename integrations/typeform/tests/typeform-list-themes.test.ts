import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-themes.js';

describe('typeform list-themes tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-themes",
      Model: "ActionOutput_typeform_listthemes"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
