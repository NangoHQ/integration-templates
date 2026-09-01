import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-ticket-message.js';

describe('gorgias delete-ticket-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-ticket-message',
        Model: 'ActionOutput_gorgias_deleteticketmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
