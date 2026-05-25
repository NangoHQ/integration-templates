import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-page-posts.js';

describe('facebook list-page-posts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-page-posts',
        Model: 'ActionOutput_facebook_listpageposts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
