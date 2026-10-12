import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/send-mail.js';

describe('outlook send-mail tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'send-mail',
        Model: 'ActionOutput_outlook_sendmail'
    });

    it('preserves the expected output for the existing send-mail fixture', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('keeps the default /me send path when no shared mailbox or sender is specified', async () => {
        const postMock = vi.fn().mockResolvedValue({ data: undefined });
        const fakeNango = { post: postMock } as unknown as Parameters<(typeof createAction)['exec']>[0];

        await createAction.exec(fakeNango, {
            message: {
                subject: 'Test',
                body: { contentType: 'text' as const, content: 'Hello' },
                toRecipients: [{ emailAddress: { address: 'recipient@example.com' } }]
            }
        });

        expect(postMock).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: '/v1.0/me/sendMail',
            data: expect.objectContaining({ message: expect.not.objectContaining({ from: expect.anything() }) }),
            retries: 0
        }));
    });

    it('should preserve the optional sender address for shared-mailbox Send As', async () => {
        const postMock = vi.fn().mockResolvedValue({ data: undefined });
        const fakeNango = {
            post: postMock
        } as unknown as Parameters<(typeof createAction)['exec']>[0];
        const input = {
            message: {
                subject: 'Test',
                body: { contentType: 'text' as const, content: 'Hello' },
                toRecipients: [{ emailAddress: { address: 'recipient@example.com' } }],
                from: { emailAddress: { address: 'shared-mailbox@example.com' } }
            }
        };

        await createAction.exec(fakeNango, input);

        expect(postMock).toHaveBeenCalledTimes(1);
        expect(postMock.mock.calls[0][0]).toMatchObject({
            endpoint: '/v1.0/me/sendMail',
            data: { message: input.message, saveToSentItems: true },
            retries: 0
        });
    });

    it('sends through the selected shared mailbox endpoint', async () => {
        const postMock = vi.fn().mockResolvedValue({ data: undefined });
        const fakeNango = { post: postMock } as unknown as Parameters<(typeof createAction)['exec']>[0];
        const input = {
            sharedMailbox: 'office@example.com',
            message: {
                subject: 'Test',
                body: { contentType: 'text' as const, content: 'Hello' },
                toRecipients: [{ emailAddress: { address: 'recipient@example.com' } }]
            }
        };

        await createAction.exec(fakeNango, input);

        expect(postMock.mock.calls[0][0]).toMatchObject({
            endpoint: '/v1.0/users/office%40example.com/sendMail',
            retries: 0
        });
    });
});
