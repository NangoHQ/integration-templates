import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-design-comment-reply.js';

describe('canva get-design-comment-reply tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-design-comment-reply',
        Model: 'ActionOutput_canva_getdesigncommentreply'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
