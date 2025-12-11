import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/lookup-user-by-email.js';

describe('slack lookup-user-by-email tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "lookup-user-by-email",
      Model: "ActionOutput_slack_lookupuserbyemail"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
