import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-thread-replies.js';

describe('slack get-thread-replies tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-thread-replies",
      Model: "ActionOutput_slack_getthreadreplies"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 