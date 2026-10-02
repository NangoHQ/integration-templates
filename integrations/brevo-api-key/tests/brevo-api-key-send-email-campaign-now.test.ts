import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-email-campaign-now.js';

describe('brevo-api-key send-email-campaign-now tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-email-campaign-now',
        Model: 'ActionOutput_brevo_api_key_sendemailcampaignnow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
