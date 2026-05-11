import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-journal-entry.js';

describe('quickbooks get-journal-entry tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-journal-entry',
        Model: 'ActionOutput_quickbooks_sandbox_getjournalentry'
    });

    it('should output the action output that is expected', async () => {
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
