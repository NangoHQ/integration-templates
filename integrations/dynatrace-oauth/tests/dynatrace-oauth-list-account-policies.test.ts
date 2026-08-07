import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-account-policies.js';

describe('dynatrace-oauth list-account-policies tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-account-policies',
        Model: 'ActionOutput_dynatrace_oauth_listaccountpolicies'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
