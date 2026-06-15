import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-auth-users.js';

describe('supabase list-auth-users tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-auth-users',
        Model: 'ActionOutput_supabase_listauthusers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
