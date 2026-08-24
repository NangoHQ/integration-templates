import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-worker-absence-balances.js';

describe('workday-refresh-token list-worker-absence-balances tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-worker-absence-balances',
        Model: 'ActionOutput_workday_refresh_token_listworkerabsencebalances'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
