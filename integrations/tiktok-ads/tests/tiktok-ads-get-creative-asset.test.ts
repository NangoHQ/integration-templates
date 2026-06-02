import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-creative-asset.js';

describe('tiktok-ads get-creative-asset tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-creative-asset',
        Model: 'ActionOutput_tiktok_ads_getcreativeasset'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
