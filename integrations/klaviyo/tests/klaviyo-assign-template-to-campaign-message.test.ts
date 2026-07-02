import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/assign-template-to-campaign-message.js';

describe('klaviyo assign-template-to-campaign-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'assign-template-to-campaign-message',
        Model: 'ActionOutput_klaviyo_assigntemplatetocampaignmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
