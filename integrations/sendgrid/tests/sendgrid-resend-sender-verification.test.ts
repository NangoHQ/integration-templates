import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/resend-sender-verification.js';

describe('sendgrid resend-sender-verification tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'resend-sender-verification',
        Model: 'ActionOutput_sendgrid_resendsenderverification'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
