import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-draft-message.js';

describe('outlook send-draft-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-draft-message',
        Model: 'ActionOutput_outlook_senddraftmessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('sends a shared-mailbox draft without retrying the non-idempotent send', async () => {
        const postMock = vi.fn().mockResolvedValue({ data: undefined });
        const fakeNango = { post: postMock } as unknown as Parameters<(typeof createAction)['exec']>[0];

        await createAction.exec(fakeNango, { sharedMailbox: 'office@example.com', message_id: 'draft-1' });

        expect(postMock).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: '/v1.0/users/office%40example.com/messages/draft-1/send',
            retries: 0
        }));
    });
});
