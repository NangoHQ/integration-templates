import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-manual-review-request.js';

describe('judgeme-oauth send-manual-review-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-manual-review-request',
        Model: 'ActionOutput_judgeme_oauth_sendmanualreviewrequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
