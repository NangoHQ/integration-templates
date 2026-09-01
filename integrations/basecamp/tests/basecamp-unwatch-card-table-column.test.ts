import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unwatch-card-table-column.js';

describe('basecamp unwatch-card-table-column tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unwatch-card-table-column',
        Model: 'ActionOutput_basecamp_unwatchcardtablecolumn'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
