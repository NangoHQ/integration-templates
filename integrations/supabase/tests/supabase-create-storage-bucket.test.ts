import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-storage-bucket.js';

describe('supabase create-storage-bucket tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-storage-bucket',
        Model: 'ActionOutput_supabase_createstoragebucket'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
