import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-holiday.js';

describe('timetastic get-holiday tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-holiday",
      Model: "ActionOutput_timetastic_getholiday"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
