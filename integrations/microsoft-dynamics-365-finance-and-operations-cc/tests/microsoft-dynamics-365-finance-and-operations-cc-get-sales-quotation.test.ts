import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-sales-quotation.js';

describe('microsoft-dynamics-365-finance-and-operations-cc get-sales-quotation tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-sales-quotation",
      Model: "ActionOutput_microsoft_dynamics_365_finance_and_operations_cc_getsalesquotation"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
