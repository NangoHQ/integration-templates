import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-accounts.js';

describe('quickbooks list-accounts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-accounts',
        Model: 'ActionOutput_quickbooks_sandbox_listaccounts'
    });

    it('should output the action output that is expected', async () => {
        // Mock getConnection to return realmId for QuickBooks
        vi.spyOn(nangoMock, 'getConnection').mockResolvedValue({
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
