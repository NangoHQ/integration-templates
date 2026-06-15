import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-stats-activity-scorecards.js';

describe('gong-oauth get-stats-activity-scorecards tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-stats-activity-scorecards',
        Model: 'ActionOutput_gong_oauth_getstatsactivityscorecards'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
