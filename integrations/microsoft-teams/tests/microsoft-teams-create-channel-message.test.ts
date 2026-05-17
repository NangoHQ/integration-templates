import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-channel-message.js';

describe('microsoft-teams create-channel-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-channel-message',
        Model: 'ActionOutput_microsoft_teams_createchannelmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
