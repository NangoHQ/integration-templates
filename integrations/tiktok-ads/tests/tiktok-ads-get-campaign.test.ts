import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-campaign.js';

describe('tiktok-ads get-campaign tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-campaign',
        Model: 'ActionOutput_tiktok_ads_getcampaign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
