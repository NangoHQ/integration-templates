import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-channel-message.js';

describe('microsoft-teams get-channel-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-channel-message',
        Model: 'ActionOutput_microsoft_teams_getchannelmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
