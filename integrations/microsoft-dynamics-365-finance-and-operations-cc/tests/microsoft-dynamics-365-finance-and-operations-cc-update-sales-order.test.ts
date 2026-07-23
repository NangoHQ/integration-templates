import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-sales-order.js';

describe('microsoft-dynamics-365-finance-and-operations-cc update-sales-order tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "update-sales-order",
      Model: "ActionOutput_microsoft_dynamics_365_finance_and_operations_cc_updatesalesorder"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
