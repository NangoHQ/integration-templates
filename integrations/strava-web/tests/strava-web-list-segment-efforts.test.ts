import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-segment-efforts.js';

describe('strava-web list-segment-efforts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-segment-efforts',
        Model: 'ActionOutput_strava_web_listsegmentefforts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
