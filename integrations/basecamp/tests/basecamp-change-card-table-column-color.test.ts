import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/change-card-table-column-color.js';

describe('basecamp change-card-table-column-color tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'change-card-table-column-color',
        Model: 'ActionOutput_basecamp_changecardtablecolumncolor'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
