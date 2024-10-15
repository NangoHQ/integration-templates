import { vi, expect, it, describe } from "vitest";

import runAction from "../actions/fetch-article.js";

describe("zendesk fetch-article tests", () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "fetch-article",
      Model: "SingleArticleResponse"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await runAction(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
