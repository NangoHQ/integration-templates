import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-attendee-response.js';

describe('google-calendar update-attendee-response tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "update-attendee-response",
      Model: "ActionOutput_google_calendar_updateattendeeresponse"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
