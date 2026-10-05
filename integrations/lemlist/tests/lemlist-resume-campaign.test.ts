import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/resume-campaign.js';

describe('lemlist resume-campaign tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'resume-campaign',
        Model: 'ActionOutput_lemlist_resumecampaign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
