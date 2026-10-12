import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-message.js';

describe('outlook update-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-message',
        Model: 'ActionOutput_outlook_updatemessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('routes shared-mailbox updates to the selected mailbox', async () => {
        const patchMock = vi.fn().mockResolvedValue({ data: { id: 'message-1' } });
        const fakeNango = { patch: patchMock } as unknown as Parameters<(typeof createAction)['exec']>[0];

        await createAction.exec(fakeNango, { sharedMailbox: 'office@example.com', messageId: 'message-1', isRead: true });

        expect(patchMock).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: '/v1.0/users/office%40example.com/messages/message-1',
            retries: 3
        }));
    });
});
