import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-chart-of-accounts.js';

describe('zoho-books list-chart-of-accounts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-chart-of-accounts',
        Model: 'ActionOutput_zoho_books_listchartofaccounts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
