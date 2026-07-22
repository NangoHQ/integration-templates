import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-public-holiday-countries.js';

describe('timetastic list-public-holiday-countries tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-public-holiday-countries",
      Model: "ActionOutput_timetastic_listpublicholidaycountries"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
