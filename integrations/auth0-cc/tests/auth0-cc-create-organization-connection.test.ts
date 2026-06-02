import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-organization-connection.js';

describe('auth0-cc create-organization-connection tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-organization-connection',
        Model: 'ActionOutput_auth0_cc_createorganizationconnection'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
