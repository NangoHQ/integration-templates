import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/enroll-lead-in-campaigns.js';

describe('lemlist enroll-lead-in-campaigns tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'enroll-lead-in-campaigns',
        Model: 'ActionOutput_lemlist_enrollleadincampaigns'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
