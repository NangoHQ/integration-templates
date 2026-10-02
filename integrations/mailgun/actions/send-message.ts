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

        const config: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/messages/post-v3--domain-name--messages
            endpoint: `/v3/${encodeURIComponent(input.domain)}/messages`,
            // Mailgun requires a form-encoded body, which the Nango proxy does not forward correctly; this endpoint accepts the same fields as query params, which sidesteps the body-serialization issue.
            params: {
                from: input.from,
                to: input.to,
                subject: input.subject,
                ...(input.text !== undefined && { text: input.text }),
                ...(input.html !== undefined && { html: input.html }),
                ...(input.cc !== undefined && { cc: input.cc }),
                ...(input.bcc !== undefined && { bcc: input.bcc })
            },
            retries: 10 // Sending is not idempotent: a retry after a lost response would deliver duplicate emails to the recipient.
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
