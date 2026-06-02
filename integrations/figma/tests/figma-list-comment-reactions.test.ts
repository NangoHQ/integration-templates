import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-comment-reactions.js';

describe('figma list-comment-reactions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-comment-reactions',
        Model: 'ActionOutput_figma_listcommentreactions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
