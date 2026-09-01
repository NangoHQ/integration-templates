import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/move-card-table-card.js';

describe('basecamp move-card-table-card tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'move-card-table-card',
        Model: 'ActionOutput_basecamp_movecardtablecard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
