import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-user-sessions.js';

describe('auth0-cc delete-user-sessions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-user-sessions',
        Model: 'ActionOutput_auth0_cc_deleteusersessions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
