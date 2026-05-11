import { vi, expect, it, describe, beforeEach } from 'vitest';

import createAction from '../actions/get-deposit.js';

describe('quickbooks get-deposit tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-deposit',
        Model: 'ActionOutput_quickbooks_sandbox_getdeposit'
    });

    beforeEach(() => {
        nangoMock.getConnection = vi.fn().mockResolvedValue({
            connection_config: {
                realmId: '9341457021722202'
            }
        });
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
