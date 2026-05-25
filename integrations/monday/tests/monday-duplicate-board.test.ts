import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/duplicate-board.js';

describe('monday duplicate-board tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'duplicate-board',
        Model: 'ActionOutput_monday_duplicateboard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
