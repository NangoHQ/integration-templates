import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/test-webhook.js';

describe('instantly test-webhook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'test-webhook',
        Model: 'ActionOutput_instantly_testwebhook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
