import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/patch-scim-user.js';

describe('1password-scim patch-scim-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'patch-scim-user',
        Model: 'ActionOutput_1password_scim_patchscimuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
