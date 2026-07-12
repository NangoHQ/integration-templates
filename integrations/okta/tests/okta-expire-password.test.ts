import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/expire-password.js';

describe('okta expire-password tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'expire-password',
        Model: 'ActionOutput_okta_cc_expirepassword'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
