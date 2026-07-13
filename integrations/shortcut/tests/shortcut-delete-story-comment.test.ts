import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-story-comment.js';

describe('shortcut delete-story-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-story-comment',
        Model: 'ActionOutput_shortcut_deletestorycomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
