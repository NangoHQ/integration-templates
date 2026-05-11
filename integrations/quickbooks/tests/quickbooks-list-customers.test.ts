import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-customers.js';

describe('quickbooks list-customers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-customers',
        Model: 'ActionOutput_quickbooks_sandbox_listcustomers'
    });

    it('should output the action output that is expected', async () => {
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
