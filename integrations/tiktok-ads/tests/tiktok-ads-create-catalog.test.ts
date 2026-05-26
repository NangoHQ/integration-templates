import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-catalog.js';

describe('tiktok-ads create-catalog tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-catalog',
        Model: 'ActionOutput_tiktok_ads_createcatalog'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
