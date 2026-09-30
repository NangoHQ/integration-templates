import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-account-verified-email-addresses.js';

describe('constant-contact list-account-verified-email-addresses tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-account-verified-email-addresses',
        Model: 'ActionOutput_constant_contact_listaccountverifiedemailaddresses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
