import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/post-message.js';

describe('slack post-message tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "post-message",
      Model: "ActionOutput_slack_postmessage"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 