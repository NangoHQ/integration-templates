import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-colors.js';

describe('google-calendar get-colors tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-colors",
      Model: "ActionOutput_google_calendar_getcolors"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
