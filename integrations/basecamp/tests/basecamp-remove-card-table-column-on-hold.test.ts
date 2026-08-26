import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-card-table-column-on-hold.js';

describe('basecamp remove-card-table-column-on-hold tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-card-table-column-on-hold',
        Model: 'ActionOutput_basecamp_removecardtablecolumnonhold'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
