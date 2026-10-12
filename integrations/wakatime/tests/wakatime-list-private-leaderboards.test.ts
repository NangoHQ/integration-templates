import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-private-leaderboards.js';

describe('wakatime list-private-leaderboards tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-private-leaderboards',
        Model: 'ActionOutput_wakatime_listprivateleaderboards'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
