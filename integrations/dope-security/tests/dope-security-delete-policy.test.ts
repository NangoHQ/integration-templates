import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-policy.js';

describe('dope-security delete-policy tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-policy',
        Model: 'ActionOutput_dope_security_deletepolicy'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
