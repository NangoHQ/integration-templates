import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-creative-assets.js';

describe('tiktok-ads list-creative-assets tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-creative-assets',
        Model: 'ActionOutput_tiktok_ads_listcreativeassets'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
