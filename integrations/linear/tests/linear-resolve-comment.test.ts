import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/resolve-comment.js';

describe('linear resolve-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'resolve-comment',
        Model: 'ActionOutput_linear_resolvecomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
