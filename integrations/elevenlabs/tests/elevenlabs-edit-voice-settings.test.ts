import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/edit-voice-settings.js';

describe('elevenlabs edit-voice-settings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'edit-voice-settings',
        Model: 'ActionOutput_elevenlabs_editvoicesettings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
