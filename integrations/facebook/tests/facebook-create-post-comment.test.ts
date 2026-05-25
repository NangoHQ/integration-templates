import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-post-comment.js';

describe('facebook create-post-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-post-comment',
        Model: 'ActionOutput_facebook_createpostcomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
