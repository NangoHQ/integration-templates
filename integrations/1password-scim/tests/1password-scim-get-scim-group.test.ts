import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-scim-group.js';

describe('1password-scim get-scim-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-scim-group',
        Model: 'ActionOutput_1password_scim_getscimgroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
