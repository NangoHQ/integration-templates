import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-form-webhook.js';

describe('basin update-form-webhook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-form-webhook',
        Model: 'ActionOutput_basin_updateformwebhook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
