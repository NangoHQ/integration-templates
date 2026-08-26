import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-card-table-column.js';

describe('basecamp get-card-table-column tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-card-table-column',
        Model: 'ActionOutput_basecamp_getcardtablecolumn'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
