import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-verification-email.js';

describe('auth0-cc send-verification-email tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-verification-email',
        Model: 'ActionOutput_auth0_cc_sendverificationemail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
