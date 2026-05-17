import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-channel-messages.js';

describe('microsoft-teams list-channel-messages tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-channel-messages',
        Model: 'ActionOutput_microsoft_teams_listchannelmessages'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
