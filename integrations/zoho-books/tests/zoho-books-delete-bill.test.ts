import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-bill.js';

describe('zoho-books delete-bill tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-bill',
        Model: 'ActionOutput_zoho_books_deletebill'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
