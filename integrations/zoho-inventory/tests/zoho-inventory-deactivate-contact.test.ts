import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/deactivate-contact.js';

describe('zoho-inventory deactivate-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'deactivate-contact',
        Model: 'ActionOutput_zoho_inventory_deactivatecontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
