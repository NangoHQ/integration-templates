import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-user-group.js';

describe('okta add-user-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-user-group',
        Model: 'ActionOutput_okta_cc_addusergroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
