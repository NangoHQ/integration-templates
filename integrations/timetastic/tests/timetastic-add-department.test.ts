import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-department.js';

describe('timetastic add-department tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "add-department",
      Model: "ActionOutput_timetastic_adddepartment"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
