import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-ads.js';

describe('tiktok-ads list-ads tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-ads',
        Model: 'ActionOutput_tiktok_ads_listads'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
