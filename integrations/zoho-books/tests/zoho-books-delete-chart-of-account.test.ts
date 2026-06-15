import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-chart-of-account.js';

describe('zoho-books delete-chart-of-account tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-chart-of-account',
        Model: 'ActionOutput_zoho_books_deletechartofaccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
