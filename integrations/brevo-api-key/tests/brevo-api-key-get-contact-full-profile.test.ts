import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-contact-full-profile.js';

describe('brevo-api-key get-contact-full-profile tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-contact-full-profile',
        Model: 'ActionOutput_brevo_api_key_getcontactfullprofile'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
