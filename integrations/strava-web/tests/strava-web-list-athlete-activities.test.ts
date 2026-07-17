import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-athlete-activities.js';

describe('strava-web list-athlete-activities tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-athlete-activities',
        Model: 'ActionOutput_strava_web_listathleteactivities'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
