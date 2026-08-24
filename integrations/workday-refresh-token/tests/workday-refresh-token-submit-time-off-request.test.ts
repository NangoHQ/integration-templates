import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/submit-time-off-request.js';

describe('workday-refresh-token submit-time-off-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'submit-time-off-request',
        Model: 'ActionOutput_workday_refresh_token_submittimeoffrequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
