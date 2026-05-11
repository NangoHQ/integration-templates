import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/refresh-webhook.js';

describe('airtable refresh-webhook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'refresh-webhook',
        Model: 'ActionOutput_airtable_refreshwebhook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
