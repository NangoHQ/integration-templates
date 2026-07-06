import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/patch-webhook.js';

describe('instantly patch-webhook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'patch-webhook',
        Model: 'ActionOutput_instantly_patchwebhook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
