import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-user-roles.js';

describe('okta list-user-roles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-user-roles',
        Model: 'ActionOutput_okta_cc_listuserroles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
