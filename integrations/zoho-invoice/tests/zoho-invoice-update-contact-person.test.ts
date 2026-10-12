import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-contact-person.js';

describe('zoho-invoice update-contact-person tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-contact-person',
        Model: 'ActionOutput_zoho_invoice_updatecontactperson'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
