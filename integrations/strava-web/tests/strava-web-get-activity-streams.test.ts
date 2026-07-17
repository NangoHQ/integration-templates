import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-activity-streams.js';

describe('strava-web get-activity-streams tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-activity-streams',
        Model: 'ActionOutput_strava_web_getactivitystreams'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
