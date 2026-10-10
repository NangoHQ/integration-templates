import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-customer-payments.js';

describe('zoho-inventory list-customer-payments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-customer-payments',
        Model: 'ActionOutput_zoho_inventory_listcustomerpayments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
