import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/restore-contact.js';

describe('freshdesk restore-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'restore-contact',
        Model: 'ActionOutput_freshdesk_restorecontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
