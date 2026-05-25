import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-campaign-report.js';

describe('mailchimp get-campaign-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-campaign-report',
        Model: 'ActionOutput_mailchimp_getcampaignreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
