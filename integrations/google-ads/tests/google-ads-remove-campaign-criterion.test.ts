import { expect, it, describe } from 'vitest';

import createAction from '../actions/remove-campaign-criterion.js';

describe('google-ads remove-campaign-criterion tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-campaign-criterion',
        Model: 'ActionOutput_google_ads_removecampaigncriterion'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
