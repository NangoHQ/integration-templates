import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/run-pivot-report.js';

describe('google-analytics run-pivot-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'run-pivot-report',
        Model: 'ActionOutput_google_analytics_runpivotreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
