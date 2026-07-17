import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-starred-segments.js';

describe('strava-web list-starred-segments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-starred-segments',
        Model: 'ActionOutput_strava_web_liststarredsegments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
