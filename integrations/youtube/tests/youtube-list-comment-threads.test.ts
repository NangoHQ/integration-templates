import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-comment-threads.js';

describe('youtube list-comment-threads tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-comment-threads',
        Model: 'ActionOutput_youtube_listcommentthreads'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
