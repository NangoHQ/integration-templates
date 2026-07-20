import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/star-segment.js';

describe('strava-web star-segment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'star-segment',
        Model: 'ActionOutput_strava_web_starsegment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
