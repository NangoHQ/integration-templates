import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-storage-bucket.js';

describe('supabase update-storage-bucket tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-storage-bucket',
        Model: 'ActionOutput_supabase_updatestoragebucket'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
