import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-estimate.js';

describe('quickbooks create-estimate tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-estimate',
        Model: 'ActionOutput_quickbooks_sandbox_createestimate'
    });

    it('should output the action output that is expected', async () => {
        // Mock getConnection to provide realmId
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
