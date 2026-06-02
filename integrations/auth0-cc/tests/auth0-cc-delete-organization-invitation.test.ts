import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-organization-invitation.js';

describe('auth0-cc delete-organization-invitation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-organization-invitation',
        Model: 'ActionOutput_auth0_cc_deleteorganizationinvitation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
