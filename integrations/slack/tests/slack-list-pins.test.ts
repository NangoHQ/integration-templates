import { vi, expect, it, describe } from 'vitest';
import createAction from '../actions/list-pins.js';

describe('slack list-pins tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-pins",
      Model: "ActionOutput_slack_listpins"
  });
  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();
      expect(response).toEqual(output);
  });
});
