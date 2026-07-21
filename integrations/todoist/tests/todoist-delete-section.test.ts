import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-section.js';

describe('todoist delete-section tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-section',
        Model: 'ActionOutput_todoist_deletesection'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
