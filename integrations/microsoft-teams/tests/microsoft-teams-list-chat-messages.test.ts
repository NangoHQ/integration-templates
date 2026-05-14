import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-chat-messages.js';

describe('microsoft-teams list-chat-messages tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-chat-messages',
        Model: 'ActionOutput_microsoft_teams_listchatmessages'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
