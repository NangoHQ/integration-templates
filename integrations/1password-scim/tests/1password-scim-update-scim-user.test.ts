import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-scim-user.js';

describe('1password-scim update-scim-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-scim-user',
        Model: 'ActionOutput_1password_scim_updatescimuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
