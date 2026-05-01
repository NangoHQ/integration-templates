import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-forwarding-addresses.js';

describe('google-mail list-forwarding-addresses tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-forwarding-addresses',
        Model: 'ActionOutput_google_mail_listforwardingaddresses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
