import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-withdrawals.js';

describe('agentcard list-withdrawals tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-withdrawals',
        Model: 'ActionOutput_agentcard_listwithdrawals'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
