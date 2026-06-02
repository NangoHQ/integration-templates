import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-permissions.js';

describe('auth0-cc get-user-permissions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-permissions',
        Model: 'ActionOutput_auth0_cc_getuserpermissions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
