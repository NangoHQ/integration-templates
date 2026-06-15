import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-estimates.js';

describe('zoho-books list-estimates tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-estimates',
        Model: 'ActionOutput_zoho_books_listestimates'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
