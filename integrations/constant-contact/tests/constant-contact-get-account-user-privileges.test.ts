import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-account-user-privileges.js';

describe('constant-contact get-account-user-privileges tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-account-user-privileges',
        Model: 'ActionOutput_constant_contact_getaccountuserprivileges'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
