import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-design-comment-reply.js';

describe('canva create-design-comment-reply tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-design-comment-reply',
        Model: 'ActionOutput_canva_createdesigncommentreply'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
