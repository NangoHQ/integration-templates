import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-contract.js';

describe('ingenious-build get-contract tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-contract',
        Model: 'ActionOutput_ingenious_build_getcontract'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
