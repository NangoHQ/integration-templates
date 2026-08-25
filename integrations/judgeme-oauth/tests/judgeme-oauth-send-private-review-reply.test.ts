import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-private-review-reply.js';

describe('judgeme-oauth send-private-review-reply tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-private-review-reply',
        Model: 'ActionOutput_judgeme_oauth_sendprivatereviewreply'
    });

    it('should throw an ActionError when the provider rejects the request (e.g. missing write_private_replies scope)', async () => {
        const input = await nangoMock.getInput();

        await expect(createAction.exec(nangoMock, input)).rejects.toMatchObject({
            payload: {
                type: 'provider_error',
                message: 'Judge.me API error',
                status: 403
            }
        });
    });
});
