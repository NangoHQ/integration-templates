import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-messages.js';

describe('slack search-messages tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "search-messages",
      Model: "ActionOutput_slack_searchmessages"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 