import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-auth-user.js';

describe('supabase get-auth-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-auth-user',
        Model: 'ActionOutput_supabase_getauthuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
