import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-ticket-forms.js';

describe('zendesk list-ticket-forms tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-ticket-forms',
        Model: 'ActionOutput_zendesk_listticketforms'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
