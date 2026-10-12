import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/deactivate-item.js';

describe('zoho-inventory deactivate-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'deactivate-item',
        Model: 'ActionOutput_zoho_inventory_deactivateitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
