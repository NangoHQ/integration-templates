import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-policy-url-bypasses.js';

describe('dope-security get-policy-url-bypasses tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-policy-url-bypasses',
        Model: 'ActionOutput_dope_security_getpolicyurlbypasses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
