import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-connection.js';

describe('auth0-cc get-connection tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-connection',
        Model: 'ActionOutput_auth0_cc_getconnection'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
