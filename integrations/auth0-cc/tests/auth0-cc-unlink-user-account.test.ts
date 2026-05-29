import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unlink-user-account.js';

describe('auth0-cc unlink-user-account tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unlink-user-account',
        Model: 'ActionOutput_auth0_cc_unlinkuseraccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
