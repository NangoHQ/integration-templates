import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-athlete-stats.js';

describe('strava-web get-athlete-stats tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-athlete-stats',
        Model: 'ActionOutput_strava_web_getathletestats'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
