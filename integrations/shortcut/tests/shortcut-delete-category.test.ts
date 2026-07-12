import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-category.js';

describe('shortcut delete-category tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-category',
        Model: 'ActionOutput_shortcut_deletecategory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
