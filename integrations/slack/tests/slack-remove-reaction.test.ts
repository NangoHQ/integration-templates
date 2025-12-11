import { vi, expect, it, describe } from 'vitest';
import createAction from '../actions/remove-reaction.js';

describe('slack remove-reaction tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "remove-reaction",
      Model: "ActionOutput_slack_removereaction"
  });
  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();
      expect(response).toEqual(output);
  });
});
