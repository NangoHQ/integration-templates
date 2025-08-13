import { expect, it, describe } from 'vitest';

import action from '../actions/create-webhook.js';

describe('airtable create-webhook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-webhook',
        Model: 'WebhookCreated'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await action.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
