import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-undone-tasks.js';

describe('ticktick list-undone-tasks tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-undone-tasks',
        Model: 'ActionOutput_ticktick_listundonetasks'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
