import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unresolve-comment.js';

describe('linear unresolve-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unresolve-comment',
        Model: 'ActionOutput_linear_unresolvecomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
