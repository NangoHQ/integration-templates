import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-athlete-clubs.js';

describe('strava-web list-athlete-clubs tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-athlete-clubs',
        Model: 'ActionOutput_strava_web_listathleteclubs'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
