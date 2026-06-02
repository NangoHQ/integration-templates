import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/run-integrated-report.js';

describe('tiktok-ads run-integrated-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'run-integrated-report',
        Model: 'ActionOutput_tiktok_ads_runintegratedreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
