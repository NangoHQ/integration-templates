import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-conference-participant.js';

describe('twilio update-conference-participant tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-conference-participant',
        Model: 'ActionOutput_twilio_updateconferenceparticipant'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
