import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-card-table-column.js';

describe('basecamp update-card-table-column tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-card-table-column',
        Model: 'ActionOutput_basecamp_updatecardtablecolumn'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
