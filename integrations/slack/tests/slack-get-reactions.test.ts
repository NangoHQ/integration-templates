import { vi, expect, it, describe } from 'vitest';
import createAction from '../actions/get-reactions.js';

describe('slack get-reactions tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "get-reactions",
      Model: "ActionOutput_slack_getreactions"
  });
  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();
      expect(response).toEqual(output);
  });
});
