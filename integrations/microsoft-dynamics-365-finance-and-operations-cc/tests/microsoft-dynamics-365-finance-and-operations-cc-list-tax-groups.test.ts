import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-tax-groups.js';

describe('microsoft-dynamics-365-finance-and-operations-cc list-tax-groups tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-tax-groups",
      Model: "ActionOutput_microsoft_dynamics_365_finance_and_operations_cc_listtaxgroups"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
