import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-automations.js';

describe('active-campaign list-automations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-automations',
        Model: 'ActionOutput_active_campaign_listautomations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
