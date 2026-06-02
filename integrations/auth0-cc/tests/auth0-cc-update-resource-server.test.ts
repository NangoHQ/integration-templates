import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-resource-server.js';

describe('auth0-cc update-resource-server tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-resource-server',
        Model: 'ActionOutput_auth0_cc_updateresourceserver'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
