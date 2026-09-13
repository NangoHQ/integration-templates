import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NangoActionMock } from 'nango/test';
function fixture(name: string) {
    return JSON.parse(readFileSync(new URL(`./${name}.fixture.json`, import.meta.url), 'utf8'));
}
function mock(name: string) {
    return new NangoActionMock({ dirname: __dirname, name, Model: 'Output' });
}

import emails from '../actions/list-emails.js';
import send from '../actions/send-email.js';
import getEmail from '../actions/get-email.js';
describe('Resend request and pagination behavior', () => {
    it('derives the next cursor only when has_more is true', async () => {
        const nango = mock('list-emails');
        nango.get.mockResolvedValueOnce({ data: { object: 'list', data: [{ id: 'email-last' }], has_more: true } });
        expect((await emails.exec(nango, { after: 'email-previous', limit: 10 })).next_cursor).toBe('email-last');
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ params: { after: 'email-previous', limit: 10 } }));
        nango.get.mockResolvedValueOnce({ data: { object: 'list', data: [{ id: 'email-last' }], has_more: false } });
        expect((await emails.exec(nango, {})).next_cursor).toBeUndefined();
        nango.get.mockResolvedValueOnce({ data: { object: 'list', data: [], has_more: false } });
        expect((await emails.exec(nango, {})).next_cursor).toBeUndefined();
    });
    it('forwards idempotency keys and preserves custom email headers', async () => {
        const nango = mock('send-email');
        nango.post.mockResolvedValue({ data: { id: 'sent' } });
        const body = { from: 'sender@example.com', to: 'recipient@example.com', subject: 'Hello', text: 'Hello', headers: { 'X-Entity-Ref-ID': 'ref' } };
        await send.exec(nango, send.input.parse({ body, idempotency_key: 'send-once' }));
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ data: body, headers: { 'Idempotency-Key': 'send-once' }, retries: 3 }));
        await send.exec(nango, send.input.parse({ body }));
        expect(nango.post).toHaveBeenLastCalledWith(expect.objectContaining({ retries: 0 }));
    });
    it('encodes email identifiers', async () => {
        const nango = mock('get-email');
        nango.get.mockResolvedValue({ data: fixture('get-email').response });
        await getEmail.exec(nango, { email_id: 'email/path?#' });
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/emails/email%2Fpath%3F%23' }));
    });
    it('validates limits and recipient requirements', () => {
        expect(emails.input.safeParse({ limit: 101 }).success).toBe(false);
        expect(emails.input.safeParse({ after: 'a', before: 'b' }).success).toBe(false);
        expect(send.input.safeParse({ body: { from: 'sender@example.com', to: 'recipient@example.com', subject: 'Hello' } }).success).toBe(false);
        expect(
            send.input.safeParse({
                body: { from: 'sender@example.com', to: 'recipient@example.com', subject: 'Hello', text: 'Hello', template: { id: 'template' } }
            }).success
        ).toBe(false);
        expect(send.input.safeParse({ body: { from: 'sender@example.com', to: [], subject: 'Hello', text: 'Hello' } }).success).toBe(false);
    });
});
