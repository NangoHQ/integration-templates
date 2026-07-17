import { expect, it, describe } from 'vitest';

import createAction from '../actions/create-campaign-budget.js';

describe('google-ads create-campaign-budget tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-campaign-budget',
        Model: 'ActionOutput_google_ads_createcampaignbudget'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
