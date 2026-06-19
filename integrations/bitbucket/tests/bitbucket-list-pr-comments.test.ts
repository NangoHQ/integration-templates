import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-pr-comments.js';

describe('bitbucket list-pr-comments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-pr-comments',
        Model: 'ActionOutput_bitbucket_listprcomments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
