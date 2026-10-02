import { expect, it, describe } from 'vitest';

import createAction from '../actions/send-immediate-campaign.js';

describe('brevo-api-key send-immediate-campaign tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-immediate-campaign',
        Model: 'ActionOutput_brevo_api_key_sendimmediatecampaign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
