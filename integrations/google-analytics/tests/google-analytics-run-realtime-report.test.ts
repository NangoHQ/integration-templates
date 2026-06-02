import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/run-realtime-report.js';

describe('google-analytics run-realtime-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'run-realtime-report',
        Model: 'ActionOutput_google_analytics_runrealtimereport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
