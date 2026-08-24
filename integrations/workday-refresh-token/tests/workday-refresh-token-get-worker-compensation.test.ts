import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-worker-compensation.js';

describe('workday-refresh-token get-worker-compensation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-worker-compensation',
        Model: 'ActionOutput_workday_refresh_token_getworkercompensation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
