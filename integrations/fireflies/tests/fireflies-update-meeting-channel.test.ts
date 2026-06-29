import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-meeting-channel.js';

describe('fireflies update-meeting-channel tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-meeting-channel',
        Model: 'ActionOutput_fireflies_updatemeetingchannel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
