import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-ticket-message.js';

describe('gorgias get-ticket-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-ticket-message',
        Model: 'ActionOutput_gorgias_getticketmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
