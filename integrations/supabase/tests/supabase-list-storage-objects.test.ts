import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-storage-objects.js';

describe('supabase list-storage-objects tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-storage-objects',
        Model: 'ActionOutput_supabase_liststorageobjects'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
