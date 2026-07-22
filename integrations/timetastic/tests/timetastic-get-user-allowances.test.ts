import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-allowances.js';

describe('timetastic get-user-allowances tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-user-allowances",
      Model: "ActionOutput_timetastic_getuserallowances"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
