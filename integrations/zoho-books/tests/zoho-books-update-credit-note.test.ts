import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-credit-note.js';

describe('zoho-books update-credit-note tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-credit-note',
        Model: 'ActionOutput_zoho_books_updatecreditnote'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
