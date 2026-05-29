import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-organization-member-roles.js';

describe('auth0-cc remove-organization-member-roles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-organization-member-roles',
        Model: 'ActionOutput_auth0_cc_removeorganizationmemberroles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
