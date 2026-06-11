import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-auth-user.js';

describe('supabase delete-auth-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-auth-user',
        Model: 'ActionOutput_supabase_deleteauthuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
