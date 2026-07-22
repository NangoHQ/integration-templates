import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-public-holiday.js';

describe('timetastic get-public-holiday tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-public-holiday",
      Model: "ActionOutput_timetastic_getpublicholiday"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
