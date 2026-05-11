import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-invoices.js';

describe('quickbooks list-invoices tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-invoices',
        Model: 'ActionOutput_quickbooks_sandbox_listinvoices'
    });

    // Mock getConnection to return realmId
    nangoMock.getConnection = vi.fn(async () => {
        return {
            connection_config: {
                realmId: '9341457021722202'
            }
        } as unknown as Awaited<ReturnType<typeof nangoMock.getConnection>>;
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
