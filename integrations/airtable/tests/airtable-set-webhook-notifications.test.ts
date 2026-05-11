import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/set-webhook-notifications.js';

describe('airtable set-webhook-notifications tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'set-webhook-notifications',
        Model: 'ActionOutput_airtable_setwebhooknotifications'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
