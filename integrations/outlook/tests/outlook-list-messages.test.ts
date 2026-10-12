import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-messages.js';

describe('outlook list-messages tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-messages',
        Model: 'ActionOutput_outlook_listmessages'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it("routes a shared-mailbox read to the selected mailbox, not the connected user's inbox", async () => {
        const getMock = vi.fn().mockResolvedValue({ data: { value: [] } });
        const fakeNango = { get: getMock } as unknown as Parameters<(typeof createAction)['exec']>[0];

        await createAction.exec(fakeNango, { sharedMailbox: 'office@example.com' });

        expect(getMock).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: '/v1.0/users/office%40example.com/mailFolders/inbox/messages'
        }));
    });

    it('accepts and routes a Graph user ID that is not an email-shaped UPN', async () => {
        const getMock = vi.fn().mockResolvedValue({ data: { value: [] } });
        const fakeNango = { get: getMock } as unknown as Parameters<(typeof createAction)['exec']>[0];

        await createAction.exec(fakeNango, { sharedMailbox: '00000000-0000-0000-0000-000000000001' });

        expect(getMock).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: '/v1.0/users/00000000-0000-0000-0000-000000000001/mailFolders/inbox/messages'
        }));
    });
});
