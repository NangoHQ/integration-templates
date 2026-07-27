import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-leave-type-icons.js';

describe('timetastic list-leave-type-icons tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-leave-type-icons",
      Model: "ActionOutput_timetastic_listleavetypeicons"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
