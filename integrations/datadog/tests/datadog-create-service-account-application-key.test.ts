import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-service-account-application-key.js';

describe('datadog create-service-account-application-key tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-service-account-application-key',
        Model: 'ActionOutput_datadog_createserviceaccountapplicationkey'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
