import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-form-webhook.js';

describe('basin get-form-webhook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-form-webhook',
        Model: 'ActionOutput_basin_getformwebhook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
