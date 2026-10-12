import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-contact-person.js';

describe('zoho-invoice create-contact-person tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-contact-person',
        Model: 'ActionOutput_zoho_invoice_createcontactperson'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
