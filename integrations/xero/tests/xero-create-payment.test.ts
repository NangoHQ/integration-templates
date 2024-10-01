import { vi, expect, it, describe } from "vitest";

import runAction from "../actions/create-payment.js";

describe("xero create-payment tests", () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "create-payment",
      Model: "PaymentActionResponse"
  });

  it('should get, map correctly the data and batchDelete the result', async () => {
      const input = await nangoMock.getInput();
      const response = await runAction(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
