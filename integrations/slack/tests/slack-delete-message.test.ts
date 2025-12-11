import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-message.js';

describe('slack delete-message tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "delete-message",
      Model: "ActionOutput_slack_deletemessage"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 