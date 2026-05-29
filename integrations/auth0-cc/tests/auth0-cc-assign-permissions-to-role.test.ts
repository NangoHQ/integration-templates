import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/assign-permissions-to-role.js';

describe('auth0-cc assign-permissions-to-role tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'assign-permissions-to-role',
        Model: 'ActionOutput_auth0_cc_assignpermissionstorole'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
