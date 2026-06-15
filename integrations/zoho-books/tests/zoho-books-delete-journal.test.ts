import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-journal.js';

describe('zoho-books delete-journal tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-journal',
        Model: 'ActionOutput_zoho_books_deletejournal'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
