import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-policy-content.js';

describe('dope-security get-policy-content tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-policy-content',
        Model: 'ActionOutput_dope_security_getpolicycontent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
