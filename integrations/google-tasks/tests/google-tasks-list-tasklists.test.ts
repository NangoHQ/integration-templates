import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-tasklists.js';

describe('google-tasks list-tasklists tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-tasklists',
        Model: 'ActionOutput_google_tasks_listtasklists'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
