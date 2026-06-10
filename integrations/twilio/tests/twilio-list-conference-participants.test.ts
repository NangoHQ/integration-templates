import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-conference-participants.js';

describe('twilio list-conference-participants tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-conference-participants',
        Model: 'ActionOutput_twilio_listconferenceparticipants'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
