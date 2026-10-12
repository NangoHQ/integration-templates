import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-project-time-summary.js';

describe('timely get-project-time-summary tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-project-time-summary',
        Model: 'ActionOutput_timely_getprojecttimesummary'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
