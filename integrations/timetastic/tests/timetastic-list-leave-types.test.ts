import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-leave-types.js';

describe('timetastic list-leave-types tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-leave-types",
      Model: "ActionOutput_timetastic_listleavetypes"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
