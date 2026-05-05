import { vi, expect, it, describe, beforeEach } from 'vitest';

import createAction from '../actions/update-bill.js';

describe('quickbooks update-bill tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-bill',
        Model: 'ActionOutput_quickbooks_sandbox_updatebill'
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
