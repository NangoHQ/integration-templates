import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const EmailIdentitySchema = z
    .object({
        email: z.string().describe('Email address. Example: "jane@example.com"'),
        name: z.string().optional().describe('Display name shown alongside the email address (max 70 characters). Example: "Jane Doe"')
    })
    .describe('An email address with an optional display name.');

const InputSchema = z
    .object({
        to: z.array(EmailIdentitySchema).min(1).describe('Recipients of the transactional email. At least one recipient is required.'),
        sender: EmailIdentitySchema.optional().describe(
            'Sender of the email. Required when templateId is not provided; when templateId is provided, the template sender is used unless overridden here.'
        ),
        subject: z
            .string()
            .optional()
            .describe('Subject line of the email. Required when templateId is not provided; overrides the template subject when templateId is provided.'),
        htmlContent: z
            .string()
            .optional()
            .describe('HTML body of the email. Required when templateId is not provided; ignored by Brevo when templateId is provided.'),
        textContent: z.string().optional().describe('Plain-text body of the email. Ignored by Brevo when templateId is provided.'),
        templateId: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('ID of a saved Brevo transactional email template to render instead of inline content. Example: 42'),
        params: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
                'Key-value pairs substituted into the template\'s {{params.KEY}} placeholders. Only applies to templates using Brevo\'s New Template Language. Example: {"FIRSTNAME": "Jane"}'
            ),
        cc: z.array(EmailIdentitySchema).optional().describe('CC recipients of the email.'),
        bcc: z.array(EmailIdentitySchema).optional().describe('BCC recipients of the email.'),
        replyTo: EmailIdentitySchema.optional().describe('Reply-to address recipients will use when replying to the email.'),
        tags: z.array(z.string()).optional().describe('Tags for categorizing and filtering the email in Brevo. Example: ["welcome", "onboarding"]')
    })
    .describe(
        'Transactional email to send: either inline content (sender + subject + htmlContent) or a saved template (templateId + params), plus the recipients.'
    );

const ProviderSendEmailResponseSchema = z.object({
    messageId: z.string().optional(),
    messageIds: z.array(z.string()).optional()
});

const OutputSchema = z
    .object({
        messageId: z.string().describe('Provider-assigned message ID of the accepted transactional email. Example: "<201798300811.5787683@relay.domain.com>"')
    })
    .describe('Result of sending the transactional email.');

/**
 * @tags: [write]
 * @tagReason: Dispatches a real transactional email through the provider, a one-way mutation, and reads no provider data.
 * @pitfalls: Every successful invocation immediately dispatches a real email that cannot be unsent, and there is no idempotency, so invoking the action again sends another copy. htmlContent and textContent are ignored when templateId is provided. A returned messageId only means Brevo accepted the email for delivery; the final delivered or bounced outcome is reported separately in the transactional email event log.
 */
const action = createAction({
    description: 'Send a one-off transactional email, either with inline HTML or by rendering a saved template with params.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.templateId === undefined && (!input.sender || !input.subject || !input.htmlContent)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'sender, subject and htmlContent are required when templateId is not provided.'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/send-transac-email
            endpoint: '/smtp/email',
            data: {
                to: input.to,
                ...(input.sender !== undefined && { sender: input.sender }),
                ...(input.subject !== undefined && { subject: input.subject }),
                ...(input.htmlContent !== undefined && { htmlContent: input.htmlContent }),
                ...(input.textContent !== undefined && { textContent: input.textContent }),
                ...(input.templateId !== undefined && { templateId: input.templateId }),
                ...(input.params !== undefined && { params: input.params }),
                ...(input.cc !== undefined && { cc: input.cc }),
                ...(input.bcc !== undefined && { bcc: input.bcc }),
                ...(input.replyTo !== undefined && { replyTo: input.replyTo }),
                ...(input.tags !== undefined && { tags: input.tags })
            },
            // Sending an email is not idempotent and Brevo offers no idempotency key for this endpoint, so a retry after a lost response would deliver a duplicate.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- deliberate retries: 0 for this non-idempotent send; the rule's autofix would silently rewrite it to 10
            retries: 0
        };

        const response = await nango.post(config);
        const parsed = ProviderSendEmailResponseSchema.parse(response.data);

        if (!parsed.messageId) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Brevo accepted the request but did not return a messageId.'
            });
        }

        return {
            messageId: parsed.messageId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
