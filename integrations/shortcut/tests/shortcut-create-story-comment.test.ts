import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-story-comment.js';

describe('shortcut create-story-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-story-comment',
        Model: 'ActionOutput_shortcut_createstorycomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
