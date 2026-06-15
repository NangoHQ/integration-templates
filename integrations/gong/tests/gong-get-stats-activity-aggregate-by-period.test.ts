import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-stats-activity-aggregate-by-period.js';

describe('gong-oauth get-stats-activity-aggregate-by-period tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-stats-activity-aggregate-by-period',
        Model: 'ActionOutput_gong_oauth_getstatsactivityaggregatebyperiod'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
