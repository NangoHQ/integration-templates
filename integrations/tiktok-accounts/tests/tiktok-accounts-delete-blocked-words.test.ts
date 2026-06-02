import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-blocked-words.js';

describe('tiktok-accounts delete-blocked-words tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-blocked-words',
        Model: 'ActionOutput_tiktok_accounts_deleteblockedwords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
