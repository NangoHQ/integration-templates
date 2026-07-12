import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-story-link.js';

describe('shortcut delete-story-link tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-story-link',
        Model: 'ActionOutput_shortcut_deletestorylink'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
