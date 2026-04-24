import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-bank-transaction.js';

describe('xero update-bank-transaction tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-bank-transaction',
        Model: 'ActionOutput_xero_updatebanktransaction'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getConnection = vi.fn().mockResolvedValue({
            metadata: {
                tenantId: '59712f8f-45a3-4d45-a705-5d0c9748317e'
            }
        });

        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
