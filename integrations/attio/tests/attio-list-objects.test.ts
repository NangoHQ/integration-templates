import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-objects.js';

describe('attio list-objects tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: 'attio',
      name: "list-objects",
      Model: "ActionOutput_attio_listobjects"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 