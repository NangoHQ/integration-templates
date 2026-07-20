import { expect, it, describe } from 'vitest';

import createAction from '../actions/create-campaign-negative-keyword.js';

describe('google-ads create-campaign-negative-keyword tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-campaign-negative-keyword',
        Model: 'ActionOutput_google_ads_createcampaignnegativekeyword'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
