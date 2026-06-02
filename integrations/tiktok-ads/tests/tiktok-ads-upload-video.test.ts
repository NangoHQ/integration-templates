import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upload-video.js';

describe('tiktok-ads upload-video tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-video',
        Model: 'ActionOutput_tiktok_ads_uploadvideo'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
