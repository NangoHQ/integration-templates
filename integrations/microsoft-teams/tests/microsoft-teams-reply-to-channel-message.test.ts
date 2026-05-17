import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/reply-to-channel-message.js';

describe('microsoft-teams reply-to-channel-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'reply-to-channel-message',
        Model: 'ActionOutput_microsoft_teams_replytochannelmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
