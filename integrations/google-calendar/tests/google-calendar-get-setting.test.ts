import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-setting.js';

describe('google-calendar get-setting tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-setting",
      Model: "ActionOutput_google_calendar_getsetting"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
