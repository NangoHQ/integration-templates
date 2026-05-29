import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-roles-from-user.js';

describe('auth0-cc remove-roles-from-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-roles-from-user',
        Model: 'ActionOutput_auth0_cc_removerolesfromuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
