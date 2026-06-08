import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/query-table-rows.js';

describe('supabase query-table-rows tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'query-table-rows',
        Model: 'ActionOutput_supabase_querytablerows'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
