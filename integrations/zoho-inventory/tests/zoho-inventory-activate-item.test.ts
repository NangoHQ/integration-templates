import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/activate-item.js';

describe('zoho-inventory activate-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'activate-item',
        Model: 'ActionOutput_zoho_inventory_activateitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
