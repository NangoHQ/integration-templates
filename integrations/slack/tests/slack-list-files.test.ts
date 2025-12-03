import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-files.js';

describe('slack list-files tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "list-files",
      Model: "ActionOutput_slack_listfiles"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 