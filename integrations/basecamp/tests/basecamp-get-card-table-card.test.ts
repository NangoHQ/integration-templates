import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-card-table-card.js';

describe('basecamp get-card-table-card tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-card-table-card',
        Model: 'ActionOutput_basecamp_getcardtablecard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
