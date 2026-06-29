import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-default-voice-settings.js';

describe('elevenlabs get-default-voice-settings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-default-voice-settings',
        Model: 'ActionOutput_elevenlabs_getdefaultvoicesettings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
