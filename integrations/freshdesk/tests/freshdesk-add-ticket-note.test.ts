import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-ticket-note.js';

describe('freshdesk add-ticket-note tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-ticket-note',
        Model: 'ActionOutput_freshdesk_addticketnote'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
