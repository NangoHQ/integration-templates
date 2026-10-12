import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-tasks.js';

describe('ticktick search-tasks tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-tasks',
        Model: 'ActionOutput_ticktick_searchtasks'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
