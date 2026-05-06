import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-ticket-fields.js';

describe('zendesk list-ticket-fields tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-ticket-fields',
        Model: 'ActionOutput_zendesk_listticketfields'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
