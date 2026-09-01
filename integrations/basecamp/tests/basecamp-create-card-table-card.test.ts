import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-card-table-card.js';

describe('basecamp create-card-table-card tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-card-table-card',
        Model: 'ActionOutput_basecamp_createcardtablecard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
