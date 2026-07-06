import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-campaign.js';

describe('klaviyo update-campaign tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-campaign',
        Model: 'ActionOutput_klaviyo_updatecampaign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
