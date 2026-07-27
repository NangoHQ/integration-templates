import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-user-carryforward.js';

describe('timetastic update-user-carryforward tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "update-user-carryforward",
      Model: "ActionOutput_timetastic_updateusercarryforward"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
