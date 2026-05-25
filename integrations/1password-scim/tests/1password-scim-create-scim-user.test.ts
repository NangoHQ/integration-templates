import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-scim-user.js';

describe('1password-scim create-scim-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-scim-user',
        Model: 'ActionOutput_1password_scim_createscimuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
