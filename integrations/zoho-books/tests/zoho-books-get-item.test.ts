import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-item.js';

describe('zoho-books get-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-item',
        Model: 'ActionOutput_zoho_books_getitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
