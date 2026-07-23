import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-policy-url-bypasses.js';

describe('dope-security delete-policy-url-bypasses tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-policy-url-bypasses',
        Model: 'ActionOutput_dope_security_deletepolicyurlbypasses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
