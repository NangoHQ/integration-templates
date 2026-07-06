import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/resume-webhook.js';

describe('instantly resume-webhook tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'resume-webhook',
        Model: 'ActionOutput_instantly_resumewebhook'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
