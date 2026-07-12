import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-authorization-server.js';

describe('okta get-authorization-server tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-authorization-server',
        Model: 'ActionOutput_okta_cc_getauthorizationserver'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
