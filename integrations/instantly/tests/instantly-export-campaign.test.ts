import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/export-campaign.js';

describe('instantly export-campaign tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'export-campaign',
        Model: 'ActionOutput_instantly_exportcampaign'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
