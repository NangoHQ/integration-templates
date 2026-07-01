import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-daily-campaign-analytics.js';

describe('instantly get-daily-campaign-analytics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-daily-campaign-analytics',
        Model: 'ActionOutput_instantly_getdailycampaignanalytics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
