import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/check-verification.js';

describe('twilio check-verification tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'check-verification',
        Model: 'ActionOutput_twilio_checkverification'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
