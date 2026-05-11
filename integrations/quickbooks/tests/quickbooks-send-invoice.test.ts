import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-invoice.js';

describe('quickbooks send-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-invoice',
        Model: 'ActionOutput_quickbooks_sandbox_sendinvoice'
    });

    it('should output the action output that is expected', async () => {
        // Mock connection data for QuickBooks realmId
        nangoMock.getConnection = vi.fn().mockResolvedValue({
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
