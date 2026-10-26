import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-tasklist-full-tree.js';

describe('google-tasks get-tasklist-full-tree tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-tasklist-full-tree',
        Model: 'ActionOutput_google_tasks_gettasklistfulltree'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
