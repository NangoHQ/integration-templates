import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-stats.js';

describe('tiktok-accounts get-user-stats tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-stats',
        Model: 'ActionOutput_tiktok_accounts_getuserstats'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
