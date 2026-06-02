import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-deal-group.js';

describe('active-campaign update-deal-group tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-deal-group',
        Model: 'ActionOutput_active_campaign_updatedealgroup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
