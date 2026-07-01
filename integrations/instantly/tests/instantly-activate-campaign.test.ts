import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/activate-campaign.js';

describe('instantly activate-campaign tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'activate-campaign',
        Model: 'ActionOutput_instantly_activatecampaign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
