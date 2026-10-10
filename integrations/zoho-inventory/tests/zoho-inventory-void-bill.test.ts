import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/void-bill.js';

describe('zoho-inventory void-bill tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'void-bill',
        Model: 'ActionOutput_zoho_inventory_voidbill'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
