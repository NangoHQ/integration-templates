import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-campaign.js';

describe('klaviyo send-campaign tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-campaign',
        Model: 'ActionOutput_klaviyo_sendcampaign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
