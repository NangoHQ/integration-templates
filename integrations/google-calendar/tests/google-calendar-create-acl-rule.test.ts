import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-acl-rule.js';

describe('google-calendar create-acl-rule tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "create-acl-rule",
      Model: "ActionOutput_google_calendar_createaclrule"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
