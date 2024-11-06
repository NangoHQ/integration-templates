import { vi, expect, it, describe } from "vitest";

import runAction from "../actions/list-all-users.js";

describe("okta list-all-users tests", () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-all-users",
      Model: "OktaListUsersResponse"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await runAction(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
