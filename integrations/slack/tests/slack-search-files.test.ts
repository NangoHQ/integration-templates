import { vi, expect, it, describe } from 'vitest';
import createAction from '../actions/search-files.js';

describe('slack search-files tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "search-files",
      Model: "ActionOutput_slack_searchfiles"
  });
  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();
      expect(response).toEqual(output);
  });
});
