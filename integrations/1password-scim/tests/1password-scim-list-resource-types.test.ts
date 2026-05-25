import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-resource-types.js';

describe('1password-scim list-resource-types tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-resource-types',
        Model: 'ActionOutput_1password_scim_listresourcetypes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
