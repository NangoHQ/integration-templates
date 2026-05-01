import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-blog-posts.js';

describe('confluence list-blog-posts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-blog-posts',
        Model: 'ActionOutput_confluence_listblogposts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
