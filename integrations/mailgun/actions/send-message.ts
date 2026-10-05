import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        domain: z
            .string()
            .describe(
                'Mailgun domain used to send the message. Example: "mg.example.com". Sandbox domains reject every send with a 403; use a verified custom domain.'
            ),
        from: z.string().describe('Email address of the From header. Supports a friendly name. Example: "Acme Billing <postmaster@mg.example.com>".'),
        to: z
            .string()
            .describe(
                'Email address of the recipient(s). Supports friendly names and comma-separated multiple recipients. Example: "Bob <bob@example.com>, alice@example.com".'
            ),
        subject: z.string().describe('Subject line of the message.'),
        text: z.string().optional().describe('Body of the message (text version). At least one of text or html must be provided.'),
        html: z.string().optional().describe('Body of the message (HTML version). At least one of text or html must be provided.'),
        cc: z.string().optional().describe('CC recipient address(es). Supports friendly names and comma-separated multiple recipients.'),
        bcc: z.string().optional().describe('BCC recipient address(es). Supports friendly names and comma-separated multiple recipients.')
    })
    .describe('Input for sending an email message through a Mailgun domain.');

const MailgunMessageSchema = z.object({
    id: z.string(),
    message: z.string()
});

const OutputSchema = z
    .object({
        id: z
            .string()
            .describe('Unique provider-assigned identifier of the queued message, in RFC-2392 format. Example: "<20261001.1.ABCDEF@mg.example.com>".'),
        message: z.string().describe('Provider status message for the send request. Example: "Queued. Thank you.".')
    })
    .describe('Result returned by Mailgun once the message has been accepted and queued for delivery.');

/**
 * @tags: [write]
 * @tagReason: Queues a new email message for delivery, creating provider-side state without any read dependency.
 * @pitfalls: Mailgun rejects every send from a sandbox domain with a 403 regardless of recipient (sandbox authorized recipients are only manageable in the Mailgun dashboard), so only a verified custom domain can deliver mail. A successful response means the message was queued for delivery, not that it reached the recipient.
 */
const action = createAction({
    description: 'Send an email message through a domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.text === undefined && input.html === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: "At least one of 'text' or 'html' must be provided to send a message."
            });
        }

        const body = new URLSearchParams({ from: input.from, to: input.to, subject: input.subject });
        if (input.text !== undefined) {
            body.append('text', input.text);
        }
        if (input.html !== undefined) {
            body.append('html', input.html);
        }
        if (input.cc !== undefined) {
            body.append('cc', input.cc);
        }
        if (input.bcc !== undefined) {
            body.append('bcc', input.bcc);
        }

        // Mailgun's v3 API requires a form-urlencoded body for this endpoint, so the body is sent pre-encoded with an explicit form Content-Type.
        const config: ProxyConfiguration = {
            method: 'POST',
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/messages/post-v3--domain-name--messages
            endpoint: `/v3/${encodeURIComponent(input.domain)}/messages`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: body.toString(),
            // Sending is not idempotent: a retry after a lost response would deliver duplicate emails to the recipient.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.post(config);
        const queued = MailgunMessageSchema.parse(response.data);

        return {
            id: queued.id,
            message: queued.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
