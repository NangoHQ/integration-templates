import { vi, expect, it, describe, beforeEach } from 'vitest';

import createAction from '../actions/list-blocked-words.js';
import mockData from './list-blocked-words.test.json';

describe('tiktok-accounts list-blocked-words tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-blocked-words',
        Model: 'ActionOutput_tiktok_accounts_listblockedwords'
    });

    beforeEach(() => {
        const accessToken = mockData.api.get['/blockedword/list/'].request.headers['Access-Token'];
        nangoMock.getConnection = vi.fn(() =>
            Promise.resolve({
                credentials: {
                    type: 'OAUTH2',
                    access_token: accessToken
                }
            })
        );
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
