import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-message-template.js';

describe('mandrill send-message-template tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-message-template',
        Model: 'ActionOutput_mandrill_sendmessagetemplate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
