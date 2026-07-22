import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-user-allowances-for-year.js';

describe('timetastic list-user-allowances-for-year tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-user-allowances-for-year",
      Model: "ActionOutput_timetastic_listuserallowancesforyear"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
