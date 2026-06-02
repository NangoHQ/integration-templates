import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-pixel.js';

describe('tiktok-ads update-pixel tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-pixel',
        Model: 'ActionOutput_tiktok_ads_updatepixel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
