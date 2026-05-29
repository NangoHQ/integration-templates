import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-organization-by-name.js';

describe('auth0-cc get-organization-by-name tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-organization-by-name',
        Model: 'ActionOutput_auth0_cc_getorganizationbyname'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
