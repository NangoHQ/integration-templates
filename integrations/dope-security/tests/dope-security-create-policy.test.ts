import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-policy.js';

describe('dope-security create-policy tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-policy',
        Model: 'ActionOutput_dope_security_createpolicy'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
