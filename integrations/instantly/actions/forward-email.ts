import { z } from 'zod';
import { createAction } from 'nango';

const BodySchema = z.object({
    html: z.string().optional(),
    text: z.string().optional()
});

const InputSchema = z.object({
    reply_to_uuid: z.string().describe('The id of the email you want to forward. Example: "019f1a8f-9da9-70c2-b20b-440cffc77ef6"'),
    to_address_email_list: z.string().describe('Comma-separated list of recipients that will receive the forwarded email. Example: "recipient@example.com"'),
    eaccount: z
        .string()
        .describe(
            'The email account that will be used to send this email. It has to be an email account connected to your workspace. Example: "jondoe@example.com"'
        ),
    subject: z.string().describe('Subject line of the forwarded email message. Example: "Fwd: Interesting update"'),
    body: BodySchema.optional().describe(
        'Optional body content for the forwarded email. Specify either html or text, or both. Required unless include_original_body is true.'
    ),
    cc_address_email_list: z.string().optional().describe('Comma-separated list of CC email addresses. Example: "cc@example.com"'),
    bcc_address_email_list: z.string().optional().describe('Comma-separated list of BCC email addresses. Example: "bcc@example.com"'),
    reply_to: z.string().optional().describe('Reply-to email address that recipients should use when replying. Example: "reply@example.com"'),
    forwarded_attachments: z.string().optional().describe('JSON-encoded forwarded attachment metadata from the original email.'),
    include_original_body: z.boolean().optional().describe('When true, append the original email headers and content after the provided body. Default: false.'),
    assigned_to: z.string().optional().describe('The user id assigned to the lead. Example: "019f1a77-d233-70e8-865a-19fd84904bb3"')
});

const ProviderAttachmentSchema = z.object({
    filename: z.string(),
    size: z.number().optional(),
    type: z.string().optional(),
    url: z.string().optional(),
    error: z.string().nullable().optional()
});

const ProviderAttachmentJsonSchema = z.object({
    files: z.array(ProviderAttachmentSchema)
});

const ProviderEmailSchema = z.object({
    id: z.string(),
    timestamp_created: z.string().optional(),
    timestamp_email: z.string().optional(),
    message_id: z.string().optional(),
    subject: z.string(),
    from_address_email: z.string().nullable().optional(),
    to_address_email_list: z.string(),
    cc_address_email_list: z.string().nullable().optional(),
    bcc_address_email_list: z.string().nullable().optional(),
    reply_to: z.string().nullable().optional(),
    body: z
        .object({
            text: z.string().optional(),
            html: z.string().optional()
        })
        .optional(),
    organization_id: z.string().optional(),
    campaign_id: z.string().nullable().optional(),
    subsequence_id: z.string().nullable().optional(),
    list_id: z.string().nullable().optional(),
    lead: z.string().nullable().optional(),
    lead_id: z.string().nullable().optional(),
    eaccount: z.string(),
    ue_type: z.number().nullable().optional(),
    step: z.string().nullable().optional(),
    is_unread: z.number().nullable().optional(),
    is_auto_reply: z.number().nullable().optional(),
    reminder_ts: z.string().nullable().optional(),
    ai_interest_value: z.number().nullable().optional(),
    ai_assisted: z.number().nullable().optional(),
    is_focused: z.number().nullable().optional(),
    i_status: z.number().nullable().optional(),
    thread_id: z.string().nullable().optional(),
    content_preview: z.string().nullable().optional(),
    attachment_json: ProviderAttachmentJsonSchema.nullable().optional(),
    from_address_json: z.array(z.unknown()).nullable().optional(),
    to_address_json: z.array(z.unknown()).nullable().optional(),
    cc_address_json: z.array(z.unknown()).nullable().optional(),
    ai_agent_id: z.string().nullable().optional()
});

const OutputSchema = ProviderEmailSchema;

const action = createAction({
    description: 'Forward an email',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['emails:create', 'emails:all', 'all:create', 'all:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.body && !input.include_original_body) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either body (with html or text) or include_original_body must be provided.'
            });
        }

        if (input.body && !input.body.html && !input.body.text) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'When body is provided, at least one of html or text must be set.'
            });
        }

        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/email/forward-an-email
            endpoint: '/v2/emails/forward',
            data: {
                reply_to_uuid: input.reply_to_uuid,
                to_address_email_list: input.to_address_email_list,
                eaccount: input.eaccount,
                subject: input.subject,
                ...(input.body !== undefined && {
                    body: {
                        ...(input.body.html !== undefined && { html: input.body.html }),
                        ...(input.body.text !== undefined && { text: input.body.text })
                    }
                }),
                ...(input.cc_address_email_list !== undefined && { cc_address_email_list: input.cc_address_email_list }),
                ...(input.bcc_address_email_list !== undefined && { bcc_address_email_list: input.bcc_address_email_list }),
                ...(input.reply_to !== undefined && { reply_to: input.reply_to }),
                ...(input.forwarded_attachments !== undefined && { forwarded_attachments: input.forwarded_attachments }),
                ...(input.include_original_body !== undefined && { include_original_body: input.include_original_body }),
                ...(input.assigned_to !== undefined && { assigned_to: input.assigned_to })
            },
            retries: 3
        });

        const providerEmail = ProviderEmailSchema.parse(response.data);

        return providerEmail;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
