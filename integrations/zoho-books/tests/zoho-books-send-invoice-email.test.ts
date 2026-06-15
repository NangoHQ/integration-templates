import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-invoice-email.js';

describe('zoho-books send-invoice-email tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-invoice-email',
        Model: 'ActionOutput_zoho_books_sendinvoiceemail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
