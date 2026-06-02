import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-account.js';

describe('active-campaign delete-account tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-account',
        Model: 'ActionOutput_active_campaign_deleteaccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
