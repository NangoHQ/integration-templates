import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upsert-contacts.js';

describe('sendgrid upsert-contacts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upsert-contacts',
        Model: 'ActionOutput_sendgrid_upsertcontacts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
