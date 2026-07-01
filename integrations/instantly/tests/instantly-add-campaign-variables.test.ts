import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-campaign-variables.js';

describe('instantly add-campaign-variables tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-campaign-variables',
        Model: 'ActionOutput_instantly_addcampaignvariables'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
