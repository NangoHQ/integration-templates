import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-campaign-steps-analytics.js';

describe('instantly get-campaign-steps-analytics tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-campaign-steps-analytics',
        Model: 'ActionOutput_instantly_getcampaignstepsanalytics'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
