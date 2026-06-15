import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-recording.js';

describe('twilio delete-recording tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-recording',
        Model: 'ActionOutput_twilio_deleterecording'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
