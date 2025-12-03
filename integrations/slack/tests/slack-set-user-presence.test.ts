import { vi, expect, it, describe } from 'vitest';
import createAction from '../actions/set-user-presence.js';

describe('slack set-user-presence tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "set-user-presence",
      Model: "ActionOutput_slack_setuserpresence"
  });
  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();
      expect(response).toEqual(output);
  });
});
