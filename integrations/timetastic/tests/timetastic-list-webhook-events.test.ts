import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-webhook-events.js';

describe('timetastic list-webhook-events tests', () => {
  const nangoMock = new global.vitest.NangoActionMock({ 
      dirname: __dirname,
      name: "list-webhook-events",
      Model: "ActionOutput_timetastic_listwebhookevents"
  });

  it('should output the action output that is expected', async () => {
      const input = await nangoMock.getInput();
      const response = await createAction.exec(nangoMock, input);
      const output = await nangoMock.getOutput();

      expect(response).toEqual(output);
  });
});
 
