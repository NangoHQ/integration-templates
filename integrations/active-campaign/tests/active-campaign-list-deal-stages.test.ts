import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-deal-stages.js';

describe('active-campaign list-deal-stages tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-deal-stages',
        Model: 'ActionOutput_active_campaign_listdealstages'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
