import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-deal-stage.js';

describe('active-campaign update-deal-stage tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-deal-stage',
        Model: 'ActionOutput_active_campaign_updatedealstage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
