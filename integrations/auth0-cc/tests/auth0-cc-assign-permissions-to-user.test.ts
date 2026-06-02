import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/assign-permissions-to-user.js';

describe('auth0-cc assign-permissions-to-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'assign-permissions-to-user',
        Model: 'ActionOutput_auth0_cc_assignpermissionstouser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
