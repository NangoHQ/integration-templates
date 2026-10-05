import { expect, it, describe } from 'vitest';

import createAction from '../actions/create-email-campaign.js';

describe('brevo-api-key create-email-campaign tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-email-campaign',
        Model: 'ActionOutput_brevo_api_key_createemailcampaign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
