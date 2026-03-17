import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/invite-users-to-conversation.js';

describe('slack-crmk invite-users-to-conversation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'invite-users-to-conversation',
        Model: 'ActionOutput_slack_crmk_inviteuserstoconversation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
