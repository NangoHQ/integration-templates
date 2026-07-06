import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/duplicate-campaign.js';

describe('instantly duplicate-campaign tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'duplicate-campaign',
        Model: 'ActionOutput_instantly_duplicatecampaign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
