import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-policy.js';

describe('dynatrace-oauth delete-policy tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-policy',
        Model: 'ActionOutput_dynatrace_oauth_deletepolicy'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
