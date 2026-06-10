import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-participant.js';

describe('twilio create-participant tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-participant',
        Model: 'ActionOutput_twilio_createparticipant'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
