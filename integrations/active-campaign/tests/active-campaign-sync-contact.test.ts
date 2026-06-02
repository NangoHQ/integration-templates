import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/sync-contact.js';

describe('active-campaign sync-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'sync-contact',
        Model: 'ActionOutput_active_campaign_synccontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
