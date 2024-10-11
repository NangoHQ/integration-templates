import { vi, expect, it, describe } from "vitest";

import runAction from "../actions/update-company.js";

describe("hubspot update-company tests", () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "update-company",
      Model: "CreateUpdateCompanyOutput"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await runAction(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
