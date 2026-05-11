import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-ticket-comments.js';

describe('zendesk get-ticket-comments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-ticket-comments',
        Model: 'ActionOutput_zendesk_getticketcomments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
