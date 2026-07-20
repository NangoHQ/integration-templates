import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-activity-kudoers.js';

describe('strava-web list-activity-kudoers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-activity-kudoers',
        Model: 'ActionOutput_strava_web_listactivitykudoers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
