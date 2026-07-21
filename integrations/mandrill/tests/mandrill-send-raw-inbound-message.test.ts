import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-raw-inbound-message.js';

describe('mandrill send-raw-inbound-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-raw-inbound-message',
        Model: 'ActionOutput_mandrill_sendrawinboundmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
