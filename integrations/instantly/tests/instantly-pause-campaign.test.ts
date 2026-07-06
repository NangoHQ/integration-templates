import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/pause-campaign.js';

describe('instantly pause-campaign tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'pause-campaign',
        Model: 'ActionOutput_instantly_pausecampaign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
