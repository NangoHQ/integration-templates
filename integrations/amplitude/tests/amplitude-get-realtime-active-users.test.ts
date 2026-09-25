import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-realtime-active-users.js';

describe('amplitude get-realtime-active-users tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-realtime-active-users',
        Model: 'ActionOutput_amplitude_getrealtimeactiveusers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
