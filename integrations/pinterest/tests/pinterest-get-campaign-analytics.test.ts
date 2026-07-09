import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-campaign-analytics.js';

describe('pinterest get-campaign-analytics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-campaign-analytics',
        Model: 'ActionOutput_pinterest_getcampaignanalytics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
