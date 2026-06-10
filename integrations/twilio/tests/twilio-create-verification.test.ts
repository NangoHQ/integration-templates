import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-verification.js';

describe('twilio create-verification tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-verification',
        Model: 'ActionOutput_twilio_createverification'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
