import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-storage-object.js';

describe('supabase delete-storage-object tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-storage-object',
        Model: 'ActionOutput_supabase_deletestorageobject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
