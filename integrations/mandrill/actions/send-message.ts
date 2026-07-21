import { z } from 'zod';
import { createAction } from 'nango';

const RecipientSchema = z.object({
    email: z.string().describe('The recipient email address. Example: "user@example.com"'),
    name: z.string().optional().describe('The recipient display name. Example: "John Doe"'),
    type: z.enum(['to', 'cc', 'bcc']).optional().describe('The recipient type. Defaults to "to".')
});

const AttachmentSchema = z.object({
    type: z.string().describe('The MIME type of the attachment. Example: "application/pdf"'),
    name: z.string().describe('The file name of the attachment. Example: "document.pdf"'),
    content: z.string().describe('Base64-encoded content of the attachment.')
});

const ImageSchema = z.object({
    type: z.string().describe('The MIME type of the image. Example: "image/png"'),
    name: z.string().describe('The Content-ID of the image, referenced as "cid:name" in HTML. Example: "logo"'),
    content: z.string().describe('Base64-encoded content of the image.')
});

const MessagePayloadSchema = z.object({
    html: z.string().optional().describe('The full HTML content of the message.'),
    text: z.string().optional().describe('The full plain-text content of the message.'),
    subject: z.string().describe('The message subject line. Example: "Welcome"'),
    from_email: z.string().describe('The sender email address. Example: "sender@example.com"'),
    from_name: z.string().optional().describe('The sender display name. Example: "Example Team"'),
    to: z.array(RecipientSchema).describe('An array of recipient objects.'),
    headers: z.record(z.string(), z.string()).optional().describe('Optional extra headers to add to the message.'),
    important: z.boolean().optional().describe('Whether this message is important and should be delivered ahead of non-important messages.'),
    track_opens: z.boolean().optional().describe('Whether to enable open tracking for this message.'),
    track_clicks: z.boolean().optional().describe('Whether to enable click tracking for this message.'),
    auto_text: z.boolean().optional().describe('Whether to automatically generate a plain-text version from the HTML content.'),
    auto_html: z.boolean().optional().describe('Whether to automatically generate HTML from the plain-text content.'),
    inline_css: z.boolean().optional().describe('Whether to automatically inline all CSS styles from style blocks in the HTML content.'),
    tags: z.array(z.string()).optional().describe('An array of string tags to apply to this message for analytics.'),
    subaccount: z.string().optional().describe('The unique ID of a subaccount for this message.'),
    google_analytics_domains: z.array(z.string()).optional().describe('An array of domains for which Google Analytics tracking parameters will be appended.'),
    metadata: z.record(z.string(), z.string()).optional().describe('Key-value metadata to associate with the message.'),
    attachments: z.array(AttachmentSchema).optional().describe('An array of file attachments.'),
    images: z.array(ImageSchema).optional().describe('An array of inline images referenced with "cid:" in the HTML content.')
});

const InputSchema = z.object({
    message: MessagePayloadSchema,
    async: z.boolean().optional().describe('Enable background sending mode optimized for bulk sending.'),
    ip_pool: z.string().optional().describe('The name of the dedicated IP pool that should be used to send this message.'),
    send_at: z
        .string()
        .optional()
        .describe('Schedule the message for future delivery in UTC (YYYY-MM-DD HH:MM:SS). Messages can be scheduled up to 7 days in advance.')
});

const SendResultSchema = z.object({
    email: z.string().describe('The recipient email address.'),
    status: z.enum(['sent', 'queued', 'scheduled', 'rejected', 'invalid']).describe('The sending status for this recipient.'),
    reject_reason: z.string().nullable().optional().describe('The reason the message was rejected, if applicable.'),
    queued_reason: z.string().nullable().optional().describe('The reason the message was queued instead of sent immediately.'),
    _id: z.string().describe("The unique message ID for this recipient's message.")
});

const OutputSchema = z.array(SendResultSchema);

const action = createAction({
    description: 'Send a new transactional email message.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/messages/send-new-message/
            endpoint: '/1.0/messages/send',
            data: {
                message: input.message,
                ...(input.async !== undefined && { async: input.async }),
                ...(input.ip_pool !== undefined && { ip_pool: input.ip_pool }),
                ...(input.send_at !== undefined && { send_at: input.send_at })
            },
            retries: 3
        });

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider returned an unexpected response format.',
                details: parsed.error.issues
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
