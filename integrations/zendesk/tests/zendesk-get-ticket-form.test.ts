import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-ticket-form.js';

describe('zendesk get-ticket-form tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-ticket-form',
        Model: 'ActionOutput_zendesk_getticketform'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
