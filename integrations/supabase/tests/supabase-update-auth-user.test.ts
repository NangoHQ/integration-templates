import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-auth-user.js';

describe('supabase update-auth-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-auth-user',
        Model: 'ActionOutput_supabase_updateauthuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
