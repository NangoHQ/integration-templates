import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/filter-tasks.js';

describe('todoist filter-tasks tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'filter-tasks',
        Model: 'ActionOutput_todoist_filtertasks'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
