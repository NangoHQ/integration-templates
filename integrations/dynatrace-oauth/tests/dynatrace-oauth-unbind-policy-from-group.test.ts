import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unbind-policy-from-group.js';

describe('dynatrace-oauth unbind-policy-from-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unbind-policy-from-group',
        Model: 'ActionOutput_dynatrace_oauth_unbindpolicyfromgroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
