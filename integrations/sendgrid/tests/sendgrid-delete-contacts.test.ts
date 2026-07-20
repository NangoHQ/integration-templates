import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-contacts.js';

describe('sendgrid delete-contacts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-contacts',
        Model: 'ActionOutput_sendgrid_deletecontacts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
