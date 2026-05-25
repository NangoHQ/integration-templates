import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/schedule-campaign.js';

describe('mailchimp schedule-campaign tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'schedule-campaign',
        Model: 'ActionOutput_mailchimp_schedulecampaign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
