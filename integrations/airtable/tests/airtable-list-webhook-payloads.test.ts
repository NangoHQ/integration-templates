import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-webhook-payloads.js';

describe('airtable list-webhook-payloads tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-webhook-payloads',
        Model: 'ActionOutput_airtable_listwebhookpayloads'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
