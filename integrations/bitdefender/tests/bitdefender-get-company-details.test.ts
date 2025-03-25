import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/get-company-details.js';

describe('bitdefender get-company-details tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-company-details",
      Model: "BitdefenderCompany"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await runAction(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
