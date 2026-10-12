import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-public-leaderboard.js';

describe('wakatime list-public-leaderboard tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-public-leaderboard',
        Model: 'ActionOutput_wakatime_listpublicleaderboard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
