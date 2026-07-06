import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/patch-campaign.js';

describe('instantly patch-campaign tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'patch-campaign',
        Model: 'ActionOutput_instantly_patchcampaign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
