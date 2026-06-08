import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-storage-object.js';

describe('supabase get-storage-object tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-storage-object',
        Model: 'ActionOutput_supabase_getstorageobject'
    });

    nangoMock.getConnection = vi.fn(async () => {
        return {
            connection_config: {
                projectUrl: 'ftbycxxoztpodvxsfjcr.supabase.co'
            }
        };
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
