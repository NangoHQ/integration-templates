import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-board.js';

describe('monday delete-board tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-board',
        Model: 'ActionOutput_monday_deleteboard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
