import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-journal-entries.js';

describe('quickbooks list-journal-entries tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-journal-entries',
        Model: 'ActionOutput_quickbooks_sandbox_listjournalentries'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();

        // Mock getConnection to provide realmId for QuickBooks
        nangoMock.getConnection = vi.fn().mockResolvedValue({
            connection_config: {
                realmId: '9341457021722202'
            }
        });

        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
