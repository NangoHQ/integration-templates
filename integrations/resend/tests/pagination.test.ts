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
import sendBatch from '../actions/send-email-batch.js';
import getEmail from '../actions/get-email.js';
import listContacts from '../actions/list-contacts.js';
import listDomains from '../actions/list-domains.js';
import listBroadcastRecipients from '../actions/list-broadcast-recipients.js';
import createContactImport from '../actions/create-contact-import.js';
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
    it('returns the first item as the cursor when paginating backwards', async () => {
        const nango = mock('list-contacts');
        nango.get.mockResolvedValueOnce({ data: { object: 'list', data: [{ id: 'contact-first' }, { id: 'contact-last' }], has_more: true } });
        expect((await listContacts.exec(nango, { before: 'contact-previous' })).next_cursor).toBe('contact-first');
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ params: { before: 'contact-previous' } }));
        nango.get.mockResolvedValueOnce({ data: { object: 'list', data: [{ id: 'contact-first' }, { id: 'contact-last' }], has_more: true } });
        expect((await listContacts.exec(nango, { after: 'contact-previous' })).next_cursor).toBe('contact-last');
        nango.get.mockResolvedValueOnce({ data: { object: 'list', data: [{ id: 'contact-first' }], has_more: false } });
        expect((await listContacts.exec(nango, { before: 'contact-previous' })).next_cursor).toBeUndefined();
    });
    it('derives a direction-aware cursor for domains', async () => {
        const nango = mock('list-domains');
        nango.get.mockResolvedValueOnce({ data: { object: 'list', data: [{ id: 'domain-first' }, { id: 'domain-last' }], has_more: true } });
        expect((await listDomains.exec(nango, { before: 'domain-previous' })).next_cursor).toBe('domain-first');
        expect(nango.get).toHaveBeenCalledWith(expect.objectContaining({ params: { before: 'domain-previous' } }));
        nango.get.mockResolvedValueOnce({ data: { object: 'list', data: [{ id: 'domain-first' }, { id: 'domain-last' }], has_more: true } });
        expect((await listDomains.exec(nango, { after: 'domain-previous' })).next_cursor).toBe('domain-last');
        expect(nango.get).toHaveBeenLastCalledWith(expect.objectContaining({ params: { after: 'domain-previous' } }));
        nango.get.mockResolvedValueOnce({ data: { object: 'list', data: [{ id: 'domain-first' }], has_more: false } });
        expect((await listDomains.exec(nango, { after: 'domain-previous' })).next_cursor).toBeUndefined();
        expect(() => listDomains.input.parse({ after: 'a', before: 'b' })).toThrow();
    });
    it('accepts null recipient lists on sent emails', async () => {
        const nango = mock('get-email');
        nango.get.mockResolvedValue({ data: { object: 'email', id: 'email-1', bcc: null, cc: null, reply_to: null, text: null, html: '<p>Hi</p>' } });
        const email = await getEmail.exec(nango, { email_id: 'email-1' });
        expect(email.bcc).toBeNull();
        expect(email.reply_to).toBeNull();
        expect(email.text).toBeNull();
    });
    it('sends contact imports as multipart form data', async () => {
        const nango = mock('create-contact-import');
        nango.post.mockResolvedValue({ data: { object: 'contact_import', id: 'import-1' } });
        const input = createContactImport.input.parse({
            body: { file: 'email\nsteve@example.com\n', filename: 'people.csv', on_conflict: 'skip', topics: [{ id: 'topic-1', subscription: 'opt_in' }] }
        });
        await createContactImport.exec(nango, input);
        const config = nango.post.mock.calls[0]?.[0];
        expect(config.retries).toBe(0);
        expect(config.headers['Content-Type']).toMatch(/^multipart\/form-data; boundary=/);
        expect(config.data).toContain('Content-Disposition: form-data; name="file"; filename="people.csv"');
        expect(config.data).toContain('email\nsteve@example.com\n');
        expect(config.data).toContain('Content-Disposition: form-data; name="on_conflict"\r\n\r\nskip');
        expect(config.data).toContain('Content-Disposition: form-data; name="topics"\r\n\r\n[{"id":"topic-1","subscription":"opt_in"}]');
        expect(config.data).not.toContain('name="column_map"');
        expect(createContactImport.input.safeParse({ body: { file: '' } }).success).toBe(false);
        expect(createContactImport.input.safeParse({}).success).toBe(false);
    });
    it('forwards idempotency keys and preserves custom email headers', async () => {
        const nango = mock('send-email');
        nango.post.mockResolvedValue({ data: { id: 'sent' } });
        const body = { from: 'sender@example.com', to: 'recipient@example.com', subject: 'Hello', text: 'Hello', headers: { 'X-Entity-Ref-ID': 'ref' } };
        await send.exec(nango, send.input.parse({ body, idempotency_key: 'send-once' }));
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ data: body, headers: { 'Idempotency-Key': 'send-once' }, retries: 3 }));
        await send.exec(nango, send.input.parse({ body }));
        expect(nango.post).toHaveBeenLastCalledWith(expect.objectContaining({ retries: 0 }));
        expect(nango.post).not.toHaveBeenLastCalledWith(
            expect.objectContaining({ headers: expect.objectContaining({ 'Idempotency-Key': expect.anything() }) })
        );
    });
    it('applies the same idempotency and retry contract to batch sends', async () => {
        const nango = mock('send-email-batch');
        nango.post.mockResolvedValue({ data: { data: [{ id: 'sent' }] } });
        const body = [{ from: 'sender@example.com', to: 'recipient@example.com', subject: 'Hello', text: 'Hello' }];
        await sendBatch.exec(nango, sendBatch.input.parse({ body, idempotency_key: 'batch-once' }));
        expect(nango.post).toHaveBeenCalledWith(expect.objectContaining({ data: body, headers: { 'Idempotency-Key': 'batch-once' }, retries: 3 }));
        await sendBatch.exec(nango, sendBatch.input.parse({ body }));
        expect(nango.post).toHaveBeenLastCalledWith(expect.objectContaining({ retries: 0 }));
        expect(() => sendBatch.input.parse({ body, idempotency_key: '' })).toThrow();
        expect(() => send.input.parse({ body: body[0], idempotency_key: '' })).toThrow();
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
        expect(
            send.input.safeParse({ body: { from: 'sender@example.com', to: 'r@example.com', subject: 'Hello', text: 'Hello', tags: [{ name: 'x' }] } }).success
        ).toBe(false);
        const batchItem = { from: 'sender@example.com', to: 'recipient@example.com', subject: 'Hello', text: 'Hello' };
        expect(sendBatch.input.safeParse({ body: [] }).success).toBe(false);
        expect(sendBatch.input.safeParse({ body: Array.from({ length: 101 }, () => batchItem) }).success).toBe(false);
        expect(sendBatch.input.safeParse({ body: Array.from({ length: 100 }, () => batchItem) }).success).toBe(true);
        expect(sendBatch.input.safeParse({ body: [{ from: 'sender@example.com', to: 'recipient@example.com', subject: 'Hello' }] }).success).toBe(false);
        expect(sendBatch.input.safeParse({ body: [{ ...batchItem, template: { id: 'template' } }] }).success).toBe(false);
        expect(listContacts.input.safeParse({ after: 'a', before: 'b' }).success).toBe(false);
        expect(listBroadcastRecipients.input.safeParse({ id: 'b', type: 'sent', bounce_type: 'permanent' }).success).toBe(false);
        expect(listBroadcastRecipients.input.safeParse({ id: 'b', type: 'bounced', bounce_type: 'permanent' }).success).toBe(true);
    });
});
