import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-acl-rule.js';

describe('google-calendar update-acl-rule tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "update-acl-rule",
      Model: "ActionOutput_google_calendar_updateaclrule"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
