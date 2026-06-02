import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upload-image.js';

describe('tiktok-ads upload-image tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-image',
        Model: 'ActionOutput_tiktok_ads_uploadimage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
