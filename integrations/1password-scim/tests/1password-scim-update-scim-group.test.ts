import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-scim-group.js';

describe('1password-scim update-scim-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-scim-group',
        Model: 'ActionOutput_1password_scim_updatescimgroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
