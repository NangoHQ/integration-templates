import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-role-from-user.js';

describe('okta remove-role-from-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-role-from-user',
        Model: 'ActionOutput_okta_cc_removerolefromuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
