import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-policy-restrictions.js';

describe('dope-security update-policy-restrictions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-policy-restrictions',
        Model: 'ActionOutput_dope_security_updatepolicyrestrictions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
