import { vi, expect, it, describe } from 'vitest';
import createAction from '../actions/list-user-reactions.js';

describe('slack list-user-reactions tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "list-user-reactions",
      Model: "ActionOutput_slack_listuserreactions"
  });
  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();
      expect(response).toEqual(output);
  });
});
