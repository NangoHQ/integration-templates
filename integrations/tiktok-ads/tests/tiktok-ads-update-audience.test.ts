import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-audience.js';

describe('tiktok-ads update-audience tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-audience',
        Model: 'ActionOutput_tiktok_ads_updateaudience'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
