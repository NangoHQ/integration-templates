import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/mark-invoice-sent.js';

describe('zoho-books mark-invoice-sent tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'mark-invoice-sent',
        Model: 'ActionOutput_zoho_books_markinvoicesent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
