import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-catalog.js';

describe('tiktok-ads get-catalog tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-catalog',
        Model: 'ActionOutput_tiktok_ads_getcatalog'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
