import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-blog-post.js';

describe('confluence get-blog-post tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-blog-post',
        Model: 'ActionOutput_confluence_getblogpost'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
