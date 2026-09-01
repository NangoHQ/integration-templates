import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-ticket-messages.js';

describe('gorgias list-ticket-messages tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-ticket-messages',
        Model: 'ActionOutput_gorgias_listticketmessages'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
