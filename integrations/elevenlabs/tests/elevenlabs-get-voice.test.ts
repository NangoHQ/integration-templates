import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-voice.js';

describe('elevenlabs get-voice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-voice',
        Model: 'ActionOutput_elevenlabs_getvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
