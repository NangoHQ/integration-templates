import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-campaign-lead.js';

describe('lemlist add-campaign-lead tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-campaign-lead',
        Model: 'ActionOutput_lemlist_addcampaignlead'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
