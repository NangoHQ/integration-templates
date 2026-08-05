import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-service-account-access-tokens.js';

describe('datadog list-service-account-access-tokens tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-service-account-access-tokens',
        Model: 'ActionOutput_datadog_listserviceaccountaccesstokens'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
