import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/invoke-rpc.js';

describe('supabase invoke-rpc tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'invoke-rpc',
        Model: 'ActionOutput_supabase_invokerpc'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
