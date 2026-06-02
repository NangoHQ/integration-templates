import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-videos.js';

describe('tiktok-accounts list-videos tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-videos',
        Model: 'ActionOutput_tiktok_accounts_listvideos'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
