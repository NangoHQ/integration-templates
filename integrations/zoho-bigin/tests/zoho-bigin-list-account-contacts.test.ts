import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-account-contacts.js';

describe('zoho-bigin list-account-contacts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-account-contacts',
        Model: 'ActionOutput_zoho_bigin_listaccountcontacts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
