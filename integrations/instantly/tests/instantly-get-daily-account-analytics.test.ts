import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-daily-account-analytics.js';

describe('instantly get-daily-account-analytics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-daily-account-analytics',
        Model: 'ActionOutput_instantly_getdailyaccountanalytics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
