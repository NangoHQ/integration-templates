import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/assign-user-public-holidays.js';

describe('timetastic assign-user-public-holidays tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "assign-user-public-holidays",
      Model: "ActionOutput_timetastic_assignuserpublicholidays"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
