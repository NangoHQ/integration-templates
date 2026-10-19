import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-tasklist.js';

describe('google-tasks get-tasklist tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-tasklist',
        Model: 'ActionOutput_google_tasks_gettasklist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
