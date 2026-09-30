import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-campaign-schedules.js';

describe('constant-contact list-campaign-schedules tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-campaign-schedules',
        Model: 'ActionOutput_constant_contact_listcampaignschedules'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
