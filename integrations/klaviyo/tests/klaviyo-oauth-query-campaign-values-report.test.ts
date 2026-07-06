import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/query-campaign-values-report.js';

describe('klaviyo-oauth query-campaign-values-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'query-campaign-values-report',
        Model: 'ActionOutput_klaviyo_oauth_querycampaignvaluesreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
