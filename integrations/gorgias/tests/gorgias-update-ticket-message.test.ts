import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-ticket-message.js';

describe('gorgias update-ticket-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-ticket-message',
        Model: 'ActionOutput_gorgias_updateticketmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
