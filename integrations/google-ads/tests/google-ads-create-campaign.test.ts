import { expect, it, describe } from 'vitest';

import createAction from '../actions/create-campaign.js';

describe('google-ads create-campaign tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-campaign',
        Model: 'ActionOutput_google_ads_createcampaign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
