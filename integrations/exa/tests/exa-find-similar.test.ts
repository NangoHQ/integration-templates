import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/find-similar.js';

describe('exa find-similar tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'find-similar',
        Model: 'ActionOutput_exa_findsimilar'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
