import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-ad-groups.js';

describe('tiktok-ads list-ad-groups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-ad-groups',
        Model: 'ActionOutput_tiktok_ads_listadgroups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
