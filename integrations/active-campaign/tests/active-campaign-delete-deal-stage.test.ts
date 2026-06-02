import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-deal-stage.js';

describe('active-campaign delete-deal-stage tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-deal-stage',
        Model: 'ActionOutput_active_campaign_deletedealstage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
