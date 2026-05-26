import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-trending-content.js';

describe('tiktok-ads get-trending-content tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-trending-content',
        Model: 'ActionOutput_tiktok_ads_gettrendingcontent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
