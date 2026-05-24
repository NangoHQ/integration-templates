import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-post-comments.js';

describe('facebook list-post-comments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-post-comments',
        Model: 'ActionOutput_facebook_listpostcomments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
