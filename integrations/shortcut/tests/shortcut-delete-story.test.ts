import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-story.js';

describe('shortcut delete-story tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-story',
        Model: 'ActionOutput_shortcut_deletestory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
