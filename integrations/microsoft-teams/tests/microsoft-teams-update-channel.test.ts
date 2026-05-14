import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-channel.js';

describe('microsoft-teams update-channel tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-channel',
        Model: 'ActionOutput_microsoft_teams_updatechannel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
