import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/clear-calendar.js';

describe('google-calendar clear-calendar tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "clear-calendar",
      Model: "ActionOutput_google_calendar_clearcalendar"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
