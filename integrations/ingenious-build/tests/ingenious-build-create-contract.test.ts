import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-contract.js';

describe('ingenious-build create-contract tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-contract',
        Model: 'ActionOutput_ingenious_build_createcontract'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
