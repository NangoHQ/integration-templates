import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-page-scheduled-posts.js';

describe('facebook list-page-scheduled-posts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-page-scheduled-posts',
        Model: 'ActionOutput_facebook_listpagescheduledposts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
