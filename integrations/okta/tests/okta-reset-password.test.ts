import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/reset-password.js';

describe('okta reset-password tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'reset-password',
        Model: 'ActionOutput_okta_cc_resetpassword'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
