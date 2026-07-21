import { z } from 'zod';
import { createAction } from 'nango';

const TemplateContentSchema = z.object({
    name: z.string(),
    content: z.string()
});

const ToRecipientSchema = z.object({
    email: z.string(),
    name: z.string().optional().nullable(),
    type: z.enum(['to', 'cc', 'bcc']).optional().nullable()
});

const MergeVarSchema = z.object({
    name: z.string(),
    content: z.string()
});

const RecipientMergeVarsSchema = z.object({
    rcpt: z.string(),
    vars: z.array(MergeVarSchema)
});

const AttachmentSchema = z.object({
    type: z.string(),
    name: z.string(),
    content: z.string()
});

const ImageSchema = z.object({
    type: z.string(),
    name: z.string(),
    content: z.string()
});

const RecipientMetadataSchema = z.object({
    rcpt: z.string(),
    values: z.record(z.string(), z.unknown())
});

const MessageSchema = z.object({
    html: z.string().optional().nullable(),
    text: z.string().optional().nullable(),
    subject: z.string().optional().nullable(),
    from_email: z.string().optional().nullable(),
    from_name: z.string().optional().nullable(),
    to: z.array(ToRecipientSchema),
    headers: z.record(z.string(), z.string()).optional(),
    important: z.boolean().optional().nullable(),
    track_opens: z.boolean().optional().nullable(),
    track_clicks: z.boolean().optional().nullable(),
    auto_text: z.boolean().optional().nullable(),
    auto_html: z.boolean().optional().nullable(),
    inline_css: z.boolean().optional().nullable(),
    url_strip_qs: z.boolean().optional().nullable(),
    preserve_recipients: z.boolean().optional().nullable(),
    view_content_link: z.boolean().optional().nullable(),
    bcc_address: z.string().optional().nullable(),
    tracking_domain: z.string().optional().nullable(),
    signing_domain: z.string().optional().nullable(),
    return_path_domain: z.string().optional().nullable(),
    merge: z.boolean().optional().nullable(),
    merge_language: z.enum(['mailchimp', 'handlebars']).optional().nullable(),
    global_merge_vars: z.array(MergeVarSchema).optional(),
    merge_vars: z.array(RecipientMergeVarsSchema).optional(),
    tags: z.array(z.string()).optional(),
    subaccount: z.string().optional().nullable(),
    google_analytics_domains: z.array(z.string()).optional(),
    google_analytics_campaign: z.string().optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    recipient_metadata: z.array(RecipientMetadataSchema).optional(),
    attachments: z.array(AttachmentSchema).optional(),
    images: z.array(ImageSchema).optional()
});

const InputSchema = z.object({
    template_name: z.string().describe("The immutable slug of a template that exists in the user's account."),
    template_content: z.array(TemplateContentSchema).describe('An array of template content to send. Each item should have name and content keys.'),
    message: MessageSchema.describe('The message payload to send, same shape as messages/send but without the html content.'),
    async: z.boolean().optional().nullable().describe('Enable a background sending mode optimized for bulk sending.'),
    ip_pool: z.string().optional().nullable().describe('Name of a dedicated IP pool to send from.'),
    send_at: z.string().optional().nullable().describe('UTC timestamp in YYYY-MM-DD HH:MM:SS format for scheduled sending.')
});

const RecipientResultSchema = z.object({
    email: z.string(),
    status: z.enum(['sent', 'queued', 'scheduled', 'rejected', 'invalid']),
    reject_reason: z.string().optional().nullable(),
    queued_reason: z.string().optional().nullable(),
    _id: z.string()
});

const OutputSchema = z.array(RecipientResultSchema);

const action = createAction({
    description: 'Send a transactional email rendered from a stored Mandrill template.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/messages/send-using-message-template/
            endpoint: '/1.0/messages/send-template',
            data: {
                template_name: input.template_name,
                template_content: input.template_content,
                message: input.message,
                ...(input.async !== undefined && input.async !== null && { async: input.async }),
                ...(input.ip_pool !== undefined && input.ip_pool !== null && { ip_pool: input.ip_pool }),
                ...(input.send_at !== undefined && input.send_at !== null && { send_at: input.send_at })
            },
            retries: 3
        });

        const parsed = z.array(RecipientResultSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider returned an unexpected response shape.',
                details: parsed.error.issues
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
