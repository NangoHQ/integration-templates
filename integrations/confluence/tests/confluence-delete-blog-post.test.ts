import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-blog-post.js';

describe('confluence delete-blog-post tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-blog-post',
        Model: 'ActionOutput_confluence_deleteblogpost'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
