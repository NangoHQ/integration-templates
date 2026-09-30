import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-campaign-summary-report.js';

describe('constant-contact get-campaign-summary-report tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-campaign-summary-report',
        Model: 'ActionOutput_constant_contact_getcampaignsummaryreport'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
