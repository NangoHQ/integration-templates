import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/enable-account-warmup.js';

describe('instantly enable-account-warmup tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'enable-account-warmup',
        Model: 'ActionOutput_instantly_enableaccountwarmup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
