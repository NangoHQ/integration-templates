import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-fulfillment-tracking.js';

describe('shopline-oauth update-fulfillment-tracking tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "update-fulfillment-tracking",
      Model: "ActionOutput_shopline_oauth_updatefulfillmenttracking"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
