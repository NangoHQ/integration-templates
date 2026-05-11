import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-deposit.js';

describe('quickbooks create-deposit tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-deposit',
        Model: 'ActionOutput_quickbooks_sandbox_createdeposit'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getConnection = vi.fn(async () => ({
            connection_config: {
                realmId: '9341457021722202'
            }
        }));
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
