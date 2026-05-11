import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-invoice.js';

describe('quickbooks update-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-invoice',
        Model: 'ActionOutput_quickbooks_sandbox_updateinvoice'
    });

    it('should output the action output that is expected', async () => {
        // Mock getConnection to return realmId from the saved API response path
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
