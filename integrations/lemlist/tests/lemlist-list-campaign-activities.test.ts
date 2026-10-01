import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-campaign-activities.js';

describe('lemlist list-campaign-activities tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-campaign-activities',
        Model: 'ActionOutput_lemlist_listcampaignactivities'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
