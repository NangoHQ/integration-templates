import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-leaderboard-standing.js';

describe('wakatime get-leaderboard-standing tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-leaderboard-standing',
        Model: 'ActionOutput_wakatime_getleaderboardstanding'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
