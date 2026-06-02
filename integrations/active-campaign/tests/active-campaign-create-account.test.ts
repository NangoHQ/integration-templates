import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-account.js';

describe('active-campaign create-account tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-account',
        Model: 'ActionOutput_active_campaign_createaccount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
