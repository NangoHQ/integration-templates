import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/stop-channel.js';

describe('google-calendar stop-channel tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'stop-channel',
        Model: 'ActionOutput_google_calendar_stopchannel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
