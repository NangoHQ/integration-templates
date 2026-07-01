import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/disable-account-warmup.js';

describe('instantly disable-account-warmup tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'disable-account-warmup',
        Model: 'ActionOutput_instantly_disableaccountwarmup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
