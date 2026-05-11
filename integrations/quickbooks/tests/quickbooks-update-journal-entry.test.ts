import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-journal-entry.js';

describe('quickbooks update-journal-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-journal-entry',
        Model: 'ActionOutput_quickbooks_sandbox_updatejournalentry'
    });

    it('should output the action output that is expected', async () => {
        // Mock getConnection to provide realmId
        nangoMock.getConnection = vi.fn(async () => ({
            connection_config: { realmId: '9341457021722202' }
        })) as unknown as typeof nangoMock.getConnection;

        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
