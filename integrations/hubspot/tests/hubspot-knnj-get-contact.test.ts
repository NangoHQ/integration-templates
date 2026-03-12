import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-contact.js';

describe('hubspot-knnj get-contact tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "get-contact",
      Model: "ActionOutput_hubspot_knnj_getcontact"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
