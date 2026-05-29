import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/link-user-account.js';

describe('auth0-cc link-user-account tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'link-user-account',
        Model: 'ActionOutput_auth0_cc_linkuseraccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
