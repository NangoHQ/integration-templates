import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-pixel.js';

describe('tiktok-ads create-pixel tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-pixel',
        Model: 'ActionOutput_tiktok_ads_createpixel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
