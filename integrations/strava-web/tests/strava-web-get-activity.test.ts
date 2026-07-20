import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-activity.js';

describe('strava-web get-activity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-activity',
        Model: 'ActionOutput_strava_web_getactivity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
