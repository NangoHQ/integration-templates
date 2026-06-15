import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/insert-table-row.js';

describe('supabase insert-table-row tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'insert-table-row',
        Model: 'ActionOutput_supabase_inserttablerow'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getConnection.mockReturnValue({
            connection_config: {
                projectUrl: 'ftbycxxoztpodvxsfjcr.supabase.co'
            }
        });
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
