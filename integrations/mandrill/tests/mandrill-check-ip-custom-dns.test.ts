import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/check-ip-custom-dns.js';

describe('mandrill check-ip-custom-dns tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'check-ip-custom-dns',
        Model: 'ActionOutput_mandrill_checkipcustomdns'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
