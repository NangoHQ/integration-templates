import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-chart-of-account.js';

describe('zoho-books create-chart-of-account tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-chart-of-account',
        Model: 'ActionOutput_zoho_books_createchartofaccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
