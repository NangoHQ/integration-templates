import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/generate-auth-link.js';

describe('supabase generate-auth-link tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'generate-auth-link',
        Model: 'ActionOutput_supabase_generateauthlink'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
