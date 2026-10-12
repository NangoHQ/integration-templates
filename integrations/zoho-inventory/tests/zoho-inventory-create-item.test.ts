import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-item.js';

describe('zoho-inventory create-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-item',
        Model: 'ActionOutput_zoho_inventory_createitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
