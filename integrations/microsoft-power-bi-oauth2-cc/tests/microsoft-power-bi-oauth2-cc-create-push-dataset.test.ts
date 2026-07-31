import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-push-dataset.js';

describe('microsoft-power-bi-oauth2-cc create-push-dataset tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "create-push-dataset",
      Model: "ActionOutput_microsoft_power_bi_oauth2_cc_createpushdataset"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
