import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-service-provider-config.js';

describe('1password-scim get-service-provider-config tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-service-provider-config',
        Model: 'ActionOutput_1password_scim_getserviceproviderconfig'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
