import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/schedule-email-campaign.js';

describe('brevo-api-key schedule-email-campaign tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'schedule-email-campaign',
        Model: 'ActionOutput_brevo_api_key_scheduleemailcampaign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
