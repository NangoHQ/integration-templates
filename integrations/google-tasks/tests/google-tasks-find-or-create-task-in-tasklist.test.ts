import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/find-or-create-task-in-tasklist.js';

describe('google-tasks find-or-create-task-in-tasklist tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'find-or-create-task-in-tasklist',
        Model: 'ActionOutput_google_tasks_findorcreatetaskintasklist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
