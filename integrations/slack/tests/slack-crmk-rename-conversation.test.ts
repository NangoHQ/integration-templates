import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/rename-conversation.js';

describe('slack-crmk rename-conversation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'rename-conversation',
        Model: 'ActionOutput_slack_crmk_renameconversation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
