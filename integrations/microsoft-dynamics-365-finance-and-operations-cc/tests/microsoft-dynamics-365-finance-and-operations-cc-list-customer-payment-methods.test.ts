import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-customer-payment-methods.js';

describe('microsoft-dynamics-365-finance-and-operations-cc list-customer-payment-methods tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-customer-payment-methods",
      Model: "ActionOutput_microsoft_dynamics_365_finance_and_operations_cc_listcustomerpaymentmethods"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
