import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-organization-members.js';

describe('auth0-cc add-organization-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-organization-members',
        Model: 'ActionOutput_auth0_cc_addorganizationmembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
