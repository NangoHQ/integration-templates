import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-deal-groups.js';

describe('active-campaign list-deal-groups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-deal-groups',
        Model: 'ActionOutput_active_campaign_listdealgroups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
