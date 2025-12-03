import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/open-dm.js';

describe('slack open-dm tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'slack',
      name: "open-dm",
      Model: "ActionOutput_slack_opendm"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 