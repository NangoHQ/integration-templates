import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/move-item-to-board.js';

describe('monday move-item-to-board tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'move-item-to-board',
        Model: 'ActionOutput_monday_moveitemtoboard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
