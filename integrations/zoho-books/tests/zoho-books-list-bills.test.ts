import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-bills.js';

describe('zoho-books list-bills tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-bills',
        Model: 'ActionOutput_zoho_books_listbills'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
