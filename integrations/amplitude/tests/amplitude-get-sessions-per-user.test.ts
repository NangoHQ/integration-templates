import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-sessions-per-user.js';

describe('amplitude get-sessions-per-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-sessions-per-user',
        Model: 'ActionOutput_amplitude_getsessionsperuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
