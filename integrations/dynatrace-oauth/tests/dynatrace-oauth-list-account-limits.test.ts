import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-account-limits.js';

describe('dynatrace-oauth list-account-limits tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-account-limits',
        Model: 'ActionOutput_dynatrace_oauth_listaccountlimits'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
