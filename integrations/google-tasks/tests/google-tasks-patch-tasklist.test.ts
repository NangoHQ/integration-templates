import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/patch-tasklist.js';

describe('google-tasks patch-tasklist tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'patch-tasklist',
        Model: 'ActionOutput_google_tasks_patchtasklist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
