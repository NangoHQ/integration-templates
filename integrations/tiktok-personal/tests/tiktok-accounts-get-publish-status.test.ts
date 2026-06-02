import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-publish-status.js';

describe('tiktok-accounts get-publish-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-publish-status',
        Model: 'ActionOutput_tiktok_accounts_getpublishstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
