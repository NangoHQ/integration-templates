import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-invoice.js';

describe('quickbooks create-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-invoice',
        Model: 'ActionOutput_quickbooks_sandbox_createinvoice'
    });

    it('should output the action output that is expected', async () => {
        // @ts-expect-error Mock getConnection to provide realmId
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
