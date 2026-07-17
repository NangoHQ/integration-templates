import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-athlete.js';

describe('strava-web get-athlete tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-athlete',
        Model: 'ActionOutput_strava_web_getathlete'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
