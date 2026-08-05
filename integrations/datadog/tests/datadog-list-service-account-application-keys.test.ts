import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-service-account-application-keys.js';

describe('datadog list-service-account-application-keys tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-service-account-application-keys',
        Model: 'ActionOutput_datadog_listserviceaccountapplicationkeys'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
