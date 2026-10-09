import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/apply-credit-note-to-invoice.js';

describe('zoho-inventory apply-credit-note-to-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'apply-credit-note-to-invoice',
        Model: 'ActionOutput_zoho_inventory_applycreditnotetoinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
