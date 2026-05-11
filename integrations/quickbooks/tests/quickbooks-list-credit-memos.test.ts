import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-credit-memos.js';

describe('quickbooks list-credit-memos tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-credit-memos',
        Model: 'ActionOutput_quickbooks_sandbox_listcreditmemos'
    });

    it('should output the action output that is expected', async () => {
        // Mock getConnection to return realmId for QuickBooks
        nangoMock.getConnection = vi.fn(async () => ({
            connection_config: {
                realmId: '9341457021722202'
            }
        }));

        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
