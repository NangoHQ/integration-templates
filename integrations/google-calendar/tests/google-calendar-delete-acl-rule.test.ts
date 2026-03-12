import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-acl-rule.js';

describe('google-calendar delete-acl-rule tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "delete-acl-rule",
      Model: "ActionOutput_google_calendar_deleteaclrule"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
