import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/request-holiday.js';

describe('timetastic request-holiday tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "request-holiday",
      Model: "ActionOutput_timetastic_requestholiday"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
