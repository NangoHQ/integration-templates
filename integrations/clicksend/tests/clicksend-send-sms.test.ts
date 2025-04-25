import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/send-sms.js';

describe('clicksend send-sms tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-sms',
        Model: 'Sms'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
