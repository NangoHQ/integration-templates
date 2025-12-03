import { vi, expect, it, describe } from 'vitest';
import createAction from '../actions/add-bookmark.js';

describe('slack add-bookmark tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "add-bookmark",
      Model: "ActionOutput_slack_addbookmark"
  });
  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();
      expect(response).toEqual(output);
  });
});
