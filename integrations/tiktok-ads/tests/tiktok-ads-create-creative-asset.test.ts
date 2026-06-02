import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-creative-asset.js';

describe('tiktok-ads create-creative-asset tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-creative-asset',
        Model: 'ActionOutput_tiktok_ads_createcreativeasset'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
