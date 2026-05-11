import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-payments.js';

describe('quickbooks list-payments tests', () => {
    // Manually configure the getConnection mock since dryrun --save doesn't capture connection_config
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-payments',
        Model: 'ActionOutput_quickbooks_sandbox_listpayments'
    });

    // Override getConnection to return proper mock data
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
