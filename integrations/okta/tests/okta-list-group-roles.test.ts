import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-group-roles.js';

describe('okta list-group-roles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-group-roles',
        Model: 'ActionOutput_okta_cc_listgrouproles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
