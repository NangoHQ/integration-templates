import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-activity-comments.js';

describe('strava-web list-activity-comments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-activity-comments',
        Model: 'ActionOutput_strava_web_listactivitycomments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
