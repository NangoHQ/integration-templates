import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-locked-date.js';

describe('timetastic add-locked-date tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "add-locked-date",
      Model: "ActionOutput_timetastic_addlockeddate"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
