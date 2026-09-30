import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-campaign-lead.js';

describe('lemlist remove-campaign-lead tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-campaign-lead',
        Model: 'ActionOutput_lemlist_removecampaignlead'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
