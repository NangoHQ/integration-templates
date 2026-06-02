import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-audiences.js';

describe('tiktok-ads list-audiences tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-audiences',
        Model: 'ActionOutput_tiktok_ads_listaudiences'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
