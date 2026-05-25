import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-scim-groups.js';

describe('1password-scim list-scim-groups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-scim-groups',
        Model: 'ActionOutput_1password_scim_listscimgroups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
