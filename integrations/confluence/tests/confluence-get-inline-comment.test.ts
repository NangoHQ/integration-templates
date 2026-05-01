import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-inline-comment.js';

describe('confluence get-inline-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-inline-comment',
        Model: 'ActionOutput_confluence_getinlinecomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
