import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-service-account-access-token.js';

describe('datadog create-service-account-access-token tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-service-account-access-token',
        Model: 'ActionOutput_datadog_createserviceaccountaccesstoken'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
