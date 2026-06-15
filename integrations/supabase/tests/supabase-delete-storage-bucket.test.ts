import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-storage-bucket.js';

describe('supabase delete-storage-bucket tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-storage-bucket',
        Model: 'ActionOutput_supabase_deletestoragebucket'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
