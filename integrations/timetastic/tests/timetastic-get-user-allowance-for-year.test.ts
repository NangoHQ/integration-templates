import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-allowance-for-year.js';

describe('timetastic get-user-allowance-for-year tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-user-allowance-for-year",
      Model: "ActionOutput_timetastic_getuserallowanceforyear"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
