import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-design-comment-replies.js';

describe('canva list-design-comment-replies tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-design-comment-replies',
        Model: 'ActionOutput_canva_listdesigncommentreplies'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
