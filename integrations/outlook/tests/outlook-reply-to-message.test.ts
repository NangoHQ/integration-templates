import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/reply-to-message.js';

describe('outlook reply-to-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'reply-to-message',
        Model: 'ActionOutput_outlook_replytomessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('routes replies through the selected shared mailbox', async () => {
        const postMock = vi.fn().mockResolvedValue({ status: 202, data: undefined });
        const fakeNango = { post: postMock } as unknown as Parameters<(typeof createAction)['exec']>[0];

        await createAction.exec(fakeNango, { sharedMailbox: 'office@example.com', messageId: 'message-1', comment: 'Thanks' });

        expect(postMock).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: '/v1.0/users/office%40example.com/messages/message-1/reply',
            retries: 0
        }));
    });
});
