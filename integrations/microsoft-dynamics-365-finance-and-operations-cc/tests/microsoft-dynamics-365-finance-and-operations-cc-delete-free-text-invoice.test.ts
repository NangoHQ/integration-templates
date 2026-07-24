import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-free-text-invoice.js';

describe('microsoft-dynamics-365-finance-and-operations-cc delete-free-text-invoice tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "delete-free-text-invoice",
      Model: "ActionOutput_microsoft_dynamics_365_finance_and_operations_cc_deletefreetextinvoice"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
