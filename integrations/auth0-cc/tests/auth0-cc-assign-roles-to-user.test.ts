import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/assign-roles-to-user.js';

describe('auth0-cc assign-roles-to-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'assign-roles-to-user',
        Model: 'ActionOutput_auth0_cc_assignrolestouser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
