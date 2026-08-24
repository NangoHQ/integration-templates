import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/execute-wql-query.js';

describe('workday-refresh-token execute-wql-query tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'execute-wql-query',
        Model: 'ActionOutput_workday_refresh_token_executewqlquery'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getConnection.mockResolvedValue({ connection_config: { tenant: 'zktechnology_pt1' } });
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
