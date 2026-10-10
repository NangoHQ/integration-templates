import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/find-or-create-salesorder-for-customer.js';

describe('zoho-inventory find-or-create-salesorder-for-customer tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'find-or-create-salesorder-for-customer',
        Model: 'ActionOutput_zoho_inventory_findorcreatesalesorderforcustomer'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
