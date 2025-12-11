import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-user-group-members.js';

describe('slack list-user-group-members tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-user-group-members",
      Model: "ActionOutput_slack_listusergroupmembers"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 