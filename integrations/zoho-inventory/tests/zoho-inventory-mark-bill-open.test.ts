import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/mark-bill-open.js';

describe('zoho-inventory mark-bill-open tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'mark-bill-open',
        Model: 'ActionOutput_zoho_inventory_markbillopen'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
