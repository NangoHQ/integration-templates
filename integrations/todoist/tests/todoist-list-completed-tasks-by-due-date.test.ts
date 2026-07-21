import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-completed-tasks-by-due-date.js';

describe('todoist list-completed-tasks-by-due-date tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-completed-tasks-by-due-date',
        Model: 'ActionOutput_todoist_listcompletedtasksbyduedate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
