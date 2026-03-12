import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/insert-calendar-to-list.js';

describe('google-calendar insert-calendar-to-list tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "insert-calendar-to-list",
      Model: "ActionOutput_google_calendar_insertcalendartolist"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
