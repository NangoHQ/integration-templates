import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/query-videos.js';

describe('tiktok-accounts query-videos tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'query-videos',
        Model: 'ActionOutput_tiktok_accounts_queryvideos'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
