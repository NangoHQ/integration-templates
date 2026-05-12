import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-items.js';

describe('quickbooks list-items tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-items',
        Model: 'ActionOutput_quickbooks_sandbox_listitems'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();

        // @allowMockOverride - Mock connection with realmId for QuickBooks
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
