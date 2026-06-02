import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-pixel.js';

describe('tiktok-ads delete-pixel tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-pixel',
        Model: 'ActionOutput_tiktok_ads_deletepixel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
