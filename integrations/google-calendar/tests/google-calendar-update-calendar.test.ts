import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-calendar.js';

describe('google-calendar update-calendar tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "update-calendar",
      Model: "ActionOutput_google_calendar_updatecalendar"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
