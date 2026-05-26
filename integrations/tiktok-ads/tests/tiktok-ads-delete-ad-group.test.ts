import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-ad-group.js';

describe('tiktok-ads delete-ad-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-ad-group',
        Model: 'ActionOutput_tiktok_ads_deleteadgroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
