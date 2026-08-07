import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-form-webhook.js';

describe('basin create-form-webhook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-form-webhook',
        Model: 'ActionOutput_basin_createformwebhook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
