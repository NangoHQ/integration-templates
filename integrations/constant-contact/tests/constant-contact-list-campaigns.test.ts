import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-campaigns.js';

describe('constant-contact list-campaigns tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-campaigns',
        Model: 'ActionOutput_constant_contact_listcampaigns'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
