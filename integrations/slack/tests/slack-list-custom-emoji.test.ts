import { vi, expect, it, describe } from 'vitest';
import createAction from '../actions/list-custom-emoji.js';

describe('slack list-custom-emoji tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-custom-emoji",
      Model: "ActionOutput_slack_listcustomemoji"
  });
  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();
      expect(response).toEqual(output);
  });
});
