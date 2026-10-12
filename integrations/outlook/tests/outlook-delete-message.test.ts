import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-message.js';

describe('outlook delete-message tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-message',
        Model: 'ActionOutput_outlook_deletemessage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('routes a shared-mailbox delete to the selected mailbox', async () => {
        const deleteMock = vi.fn().mockResolvedValue({ data: undefined });
        const fakeNango = { delete: deleteMock } as unknown as Parameters<(typeof createAction)['exec']>[0];

        await createAction.exec(fakeNango, { sharedMailbox: 'office@example.com', messageId: 'message/id' });

        expect(deleteMock).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: '/v1.0/users/office%40example.com/messages/message%2Fid',
            retries: 0
        }));
    });
});
