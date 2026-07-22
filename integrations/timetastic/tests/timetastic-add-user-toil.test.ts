import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-user-toil.js';

describe('timetastic add-user-toil tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "add-user-toil",
      Model: "ActionOutput_timetastic_addusertoil"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
