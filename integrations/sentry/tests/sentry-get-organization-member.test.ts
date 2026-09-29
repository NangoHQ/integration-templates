import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-organization-member.js';

describe('sentry get-organization-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-organization-member',
        Model: 'ActionOutput_sentry_getorganizationmember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
