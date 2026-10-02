import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-form-webhook.js';

describe('jotform add-form-webhook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-form-webhook',
        Model: 'ActionOutput_jotform_addformwebhook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
