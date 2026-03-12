import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-attendee.js';

describe('google-calendar remove-attendee tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "remove-attendee",
      Model: "ActionOutput_google_calendar_removeattendee"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
