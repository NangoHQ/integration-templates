import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-pr-comment.js';

describe('bitbucket create-pr-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-pr-comment',
        Model: 'ActionOutput_bitbucket_createprcomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
