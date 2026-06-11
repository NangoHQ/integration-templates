import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-auth-factors.js';

describe('supabase list-auth-factors tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-auth-factors',
        Model: 'ActionOutput_supabase_listauthfactors'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
