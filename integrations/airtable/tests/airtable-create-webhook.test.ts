import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-webhook.js';

describe('airtable create-webhook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-webhook',
        Model: 'ActionOutput_airtable_createwebhook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
