import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-segment-streams.js';

describe('strava-web get-segment-streams tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-segment-streams',
        Model: 'ActionOutput_strava_web_getsegmentstreams'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
