import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-webhook.js';

describe('aircall delete-webhook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-webhook',
        Model: 'ActionOutput_aircall_basic_deletewebhook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
