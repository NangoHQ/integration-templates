import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-ephemeral-message.js';

describe('slack-crmk send-ephemeral-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-ephemeral-message',
        Model: 'ActionOutput_slack_crmk_sendephemeralmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
