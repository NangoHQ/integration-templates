import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-account-analytics.js';

describe('pinterest get-user-account-analytics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-account-analytics',
        Model: 'ActionOutput_pinterest_getuseraccountanalytics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
