import { vi, expect, it, describe } from 'vitest';

vi.mock('crypto', async (importOriginal) => {
    const actual = await importOriginal<typeof import('crypto')>();
    return { ...actual, randomUUID: () => '00000000-0000-0000-0000-000000000000' };
});

import createAction from '../actions/create-bank-transaction.js';

describe('xero create-bank-transaction tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-bank-transaction',
        Model: 'ActionOutput_xero_createbanktransaction'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getConnection = vi.fn().mockResolvedValue({
            connection_config: {
                tenant_id: '59712f8f-45a3-4d45-a705-5d0c9748317e'
            },
            metadata: {}
        });

        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
