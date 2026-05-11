import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-credit-memo.js';

describe('quickbooks get-credit-memo tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-credit-memo',
        Model: 'ActionOutput_quickbooks_sandbox_getcreditmemo'
    });

    it('should output the action output that is expected', async () => {
        // Mock the connection data that includes realmId
        nangoMock.getConnection.mockResolvedValue({
            connection_config: {
                realmId: '9341457021722202'
            }
        });

        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
