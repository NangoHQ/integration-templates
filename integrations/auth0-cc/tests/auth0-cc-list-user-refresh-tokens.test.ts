import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-user-refresh-tokens.js';

describe('auth0-cc list-user-refresh-tokens tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-user-refresh-tokens',
        Model: 'ActionOutput_auth0_cc_listuserrefreshtokens'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
