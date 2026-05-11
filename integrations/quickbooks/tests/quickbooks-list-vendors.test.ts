import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-vendors.js';

describe('quickbooks list-vendors tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-vendors',
        Model: 'ActionOutput_quickbooks_sandbox_listvendors'
    });
           nangoMock.getConnection = vi.fn().mockResolvedValue({
            connection_config: {
                realmId: '9341457021722202'
            }
        });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
