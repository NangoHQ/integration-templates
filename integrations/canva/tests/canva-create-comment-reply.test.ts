import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-comment-reply.js';

describe('canva create-comment-reply tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-comment-reply',
        Model: 'ActionOutput_canva_createcommentreply'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
