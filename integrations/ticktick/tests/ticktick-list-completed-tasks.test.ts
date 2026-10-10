import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-completed-tasks.js';

describe('ticktick list-completed-tasks tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-completed-tasks',
        Model: 'ActionOutput_ticktick_listcompletedtasks'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
