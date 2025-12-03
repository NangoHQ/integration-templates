import { vi, expect, it, describe } from 'vitest';
import createAction from '../actions/get-dnd-info.js';

describe('slack get-dnd-info tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "get-dnd-info",
      Model: "ActionOutput_slack_getdndinfo"
  });
  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();
      expect(response).toEqual(output);
  });
});
