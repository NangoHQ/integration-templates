import { expect, it, describe } from 'vitest';

import createAction from '../actions/update-campaign-budget.js';

describe('google-ads update-campaign-budget tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-campaign-budget',
        Model: 'ActionOutput_google_ads_updatecampaignbudget'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
