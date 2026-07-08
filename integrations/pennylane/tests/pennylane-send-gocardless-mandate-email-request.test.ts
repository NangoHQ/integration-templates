import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-gocardless-mandate-email-request.js';

describe('pennylane send-gocardless-mandate-email-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-gocardless-mandate-email-request',
        Model: 'ActionOutput_pennylane_sendgocardlessmandateemailrequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
