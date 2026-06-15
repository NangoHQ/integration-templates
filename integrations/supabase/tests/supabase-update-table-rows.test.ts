import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-table-rows.js';

describe('supabase update-table-rows tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-table-rows',
        Model: 'ActionOutput_supabase_updatetablerows'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
