import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-users.js';

describe('slack list-users tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "list-users",
      Model: "ActionOutput_slack_listusers"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
