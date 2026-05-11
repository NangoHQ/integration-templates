import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-deposits.js';

describe('quickbooks list-deposits tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-deposits',
        Model: 'ActionOutput_quickbooks_sandbox_listdeposits'
    });

    // @allowMockSetup - Mock the connection to provide realmId required by the action
    nangoMock.getConnection = vi.fn(async () => ({
        connection_config: {
            realmId: '9341457021722202'
        }
    }));

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
