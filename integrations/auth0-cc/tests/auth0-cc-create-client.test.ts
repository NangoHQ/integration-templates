import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-client.js';

describe('auth0-cc create-client tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-client',
        Model: 'ActionOutput_auth0_cc_createclient'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
