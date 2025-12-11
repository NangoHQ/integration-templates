import { vi, expect, it, describe } from 'vitest';
import createAction from '../actions/add-reaction.js';

describe('slack add-reaction tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "add-reaction",
      Model: "ActionOutput_slack_addreaction"
  });
  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();
      expect(response).toEqual(output);
  });
});
