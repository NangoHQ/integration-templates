import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-space-blog-posts.js';

describe('confluence list-space-blog-posts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-space-blog-posts',
        Model: 'ActionOutput_confluence_listspaceblogposts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
