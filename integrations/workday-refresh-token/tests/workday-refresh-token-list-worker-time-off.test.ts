import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-worker-time-off.js';

describe('workday-refresh-token list-worker-time-off tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-worker-time-off',
        Model: 'ActionOutput_workday_refresh_token_listworkertimeoff'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getConnection = vi.fn(async () => ({
            connection_config: { tenant: 'zktechnology_pt1' }
        }));
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
