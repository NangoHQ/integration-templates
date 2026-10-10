import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/activate-contact.js';

describe('zoho-inventory activate-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'activate-contact',
        Model: 'ActionOutput_zoho_inventory_activatecontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
