import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-user-from-conversation.js';

describe('slack-crmk remove-user-from-conversation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-user-from-conversation',
        Model: 'ActionOutput_slack_crmk_removeuserfromconversation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
