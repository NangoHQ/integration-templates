import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-signed-url.js';

describe('supabase create-signed-url tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-signed-url',
        Model: 'ActionOutput_supabase_createsignedurl'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
