import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-user-allowances.js';

describe('timetastic list-user-allowances tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-user-allowances",
      Model: "ActionOutput_timetastic_listuserallowances"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
