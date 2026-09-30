import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-campaign-activity.js';

describe('constant-contact get-campaign-activity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-campaign-activity',
        Model: 'ActionOutput_constant_contact_getcampaignactivity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
