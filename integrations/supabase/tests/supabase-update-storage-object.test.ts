import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-storage-object.js';

describe('supabase update-storage-object tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-storage-object',
        Model: 'ActionOutput_supabase_updatestorageobject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
