import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-advertiser.js';

describe('tiktok-ads get-advertiser tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-advertiser',
        Model: 'ActionOutput_tiktok_ads_getadvertiser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
