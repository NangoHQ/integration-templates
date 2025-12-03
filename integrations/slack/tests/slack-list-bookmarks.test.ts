import { vi, expect, it, describe } from 'vitest';
import createAction from '../actions/list-bookmarks.js';

describe('slack list-bookmarks tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "list-bookmarks",
      Model: "ActionOutput_slack_listbookmarks"
  });
  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();
      expect(response).toEqual(output);
  });
});
