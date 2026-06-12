import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-bill.js';

describe('zoho-books update-bill tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-bill',
        Model: 'ActionOutput_zoho_books_updatebill'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
