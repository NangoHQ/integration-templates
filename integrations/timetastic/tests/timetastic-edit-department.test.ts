import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/edit-department.js';

describe('timetastic edit-department tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "edit-department",
      Model: "ActionOutput_timetastic_editdepartment"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
