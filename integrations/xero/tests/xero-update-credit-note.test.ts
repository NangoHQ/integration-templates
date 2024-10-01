import { vi, expect, it, describe } from "vitest";

import runAction from "../actions/update-credit-note.js";

describe("xero update-credit-note tests", () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "update-credit-note",
      Model: "CreditNoteActionResponse"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await runAction(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
