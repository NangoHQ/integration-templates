import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/reply-all-to-message.js';

describe('outlook reply-all-to-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'reply-all-to-message',
        Model: 'ActionOutput_outlook_replyalltomessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('routes a shared-mailbox reply-all without retrying a non-idempotent send', async () => {
        const postMock = vi.fn().mockResolvedValue({ status: 202, data: undefined });
        const fakeNango = { post: postMock } as unknown as Parameters<(typeof createAction)['exec']>[0];

        await createAction.exec(fakeNango, {
            sharedMailbox: 'office@example.com',
            messageId: 'message-1',
            comment: 'Thanks'
        });

        expect(postMock).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: '/v1.0/users/office%40example.com/messages/message-1/replyAll',
            retries: 0
        }));
    });

    it('creates a shared-mailbox reply-all draft without retrying draft creation', async () => {
        const postMock = vi.fn().mockResolvedValue({ data: { id: 'draft-1' } });
        const patchMock = vi.fn().mockResolvedValue({ data: {} });
        const fakeNango = { post: postMock, patch: patchMock } as unknown as Parameters<(typeof createAction)['exec']>[0];

        await createAction.exec(fakeNango, {
            sharedMailbox: 'office@example.com',
            messageId: 'message-1',
            comment: 'Thanks',
            createDraft: true
        });

        expect(postMock).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: '/v1.0/users/office%40example.com/messages/message-1/createReplyAll',
            retries: 0
        }));
        expect(patchMock).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: '/v1.0/users/office%40example.com/messages/draft-1',
            retries: 0
        }));
    });
});
