import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-message.js';

describe('twilio update-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-message',
        Model: 'ActionOutput_twilio_updatemessage'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getToken = vi.fn(async () => ({ type: 'BASIC', username: 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa00', password: 'test' }));
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
