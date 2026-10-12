import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-tax.js';

describe('zoho-inventory get-tax tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-tax',
        Model: 'ActionOutput_zoho_inventory_gettax'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
