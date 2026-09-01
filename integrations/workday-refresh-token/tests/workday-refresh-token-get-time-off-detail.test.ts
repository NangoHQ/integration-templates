import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-time-off-detail.js';

describe('workday-refresh-token get-time-off-detail tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-time-off-detail',
        Model: 'ActionOutput_workday_refresh_token_gettimeoffdetail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
