import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-transcription.js';

describe('twilio get-transcription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-transcription',
        Model: 'ActionOutput_twilio_gettranscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
