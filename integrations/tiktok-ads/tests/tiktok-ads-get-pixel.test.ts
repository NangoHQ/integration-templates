import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-pixel.js';

describe('tiktok-ads get-pixel tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-pixel',
        Model: 'ActionOutput_tiktok_ads_getpixel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
