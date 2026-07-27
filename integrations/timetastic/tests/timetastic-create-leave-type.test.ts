import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-leave-type.js';

describe('timetastic create-leave-type tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "create-leave-type",
      Model: "ActionOutput_timetastic_createleavetype"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
