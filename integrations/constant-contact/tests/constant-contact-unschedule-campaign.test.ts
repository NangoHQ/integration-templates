import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unschedule-campaign.js';

describe('constant-contact unschedule-campaign tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unschedule-campaign',
        Model: 'ActionOutput_constant_contact_unschedulecampaign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
