import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-leave-type-colors.js';

describe('timetastic list-leave-type-colors tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-leave-type-colors",
      Model: "ActionOutput_timetastic_listleavetypecolors"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
