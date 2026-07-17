import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-club.js';

describe('strava-web get-club tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-club',
        Model: 'ActionOutput_strava_web_getclub'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
