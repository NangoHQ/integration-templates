import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/whoami.js';

describe('google-calendar whoami tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "whoami",
      Model: "ActionOutput_google_calendar_whoami"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
