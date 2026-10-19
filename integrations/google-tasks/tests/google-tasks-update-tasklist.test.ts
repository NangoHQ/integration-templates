import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-tasklist.js';

describe('google-tasks update-tasklist tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-tasklist',
        Model: 'ActionOutput_google_tasks_updatetasklist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
