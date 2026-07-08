import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/assign-role-to-user.js';

describe('okta assign-role-to-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'assign-role-to-user',
        Model: 'ActionOutput_okta_cc_assignroletouser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
