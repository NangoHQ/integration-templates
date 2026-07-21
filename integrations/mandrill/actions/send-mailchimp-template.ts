import { z } from 'zod';
import { createAction } from 'nango';

const MessageRecipientSchema = z.object({
    email: z.string().describe('The email address of the recipient. Example: "to.email@example.com"'),
    name: z.string().optional().describe('The optional display name to use for the recipient. Example: "Recipient Name"'),
    type: z.enum(['to', 'cc', 'bcc']).optional().describe('The header type to use for the recipient. Defaults to "to".')
});

const MergeVarSchema = z.object({
    name: z.string(),
    content: z.string()
});

const PerRecipientMergeVarsSchema = z.object({
    rcpt: z.string().describe('Email address of the recipient. Example: "recipient.email@example.com"'),
    vars: z.array(MergeVarSchema)
});

const TemplateContentSchema = z.object({
    name: z.string().describe('The name of the mc:edit editable region to inject into.'),
    content: z.string().describe('The content to inject.')
});

const MessageInputSchema = z
    .object({
        html: z.string().optional().describe('The full HTML content to be sent.'),
        text: z.string().optional().describe('The optional full text content to be sent.'),
        subject: z.string().optional().describe('The message subject.'),
        from_email: z.string().optional().describe('The sender email address. Example: "message.from@example.com"'),
        from_name: z.string().optional().describe('The optional from name to be used. Example: "Example Name"'),
        to: z.array(MessageRecipientSchema).describe('An array of recipient information.'),
        headers: z.record(z.string(), z.string()).optional().describe('Optional extra headers to add to the message.'),
        important: z.boolean().optional().describe('Whether or not this message is important.'),
        track_opens: z.boolean().optional().describe('Whether or not to turn on open tracking for the message.'),
        track_clicks: z.boolean().optional().describe('Whether or not to turn on click tracking for the message.'),
        auto_text: z.boolean().optional().describe('Whether or not to automatically generate a text part for messages that are not given text.'),
        auto_html: z.boolean().optional().describe('Whether or not to automatically generate an HTML part for messages that are not given HTML.'),
        inline_css: z.boolean().optional().describe('Whether or not to automatically inline all CSS styles provided in the message HTML.'),
        url_strip_qs: z.boolean().optional().describe('Whether or not to strip the query string from URLs when aggregating tracked URL data.'),
        preserve_recipients: z.boolean().optional().describe('Whether or not to expose all recipients in the To header for each email.'),
        view_content_link: z.boolean().optional().describe('Set to false to remove content logging for sensitive emails.'),
        bcc_address: z.string().optional().describe("An optional address to receive an exact copy of each recipient's email."),
        tracking_domain: z.string().optional().describe('A custom domain to use for tracking opens and clicks instead of mandrillapp.com.'),
        signing_domain: z.string().optional().describe('A custom domain to use for SPF/DKIM signing instead of mandrill.'),
        return_path_domain: z.string().optional().describe("A custom domain to use for the message's return-path."),
        merge: z.boolean().optional().describe('Whether to evaluate merge tags in the message.'),
        merge_language: z
            .enum(['mailchimp', 'handlebars'])
            .optional()
            .describe('The merge tag language to use when evaluating merge tags. Defaults to "mailchimp".'),
        global_merge_vars: z.array(MergeVarSchema).optional().describe('Global merge variables to use for all recipients.'),
        merge_vars: z
            .array(PerRecipientMergeVarsSchema)
            .optional()
            .describe('Per-recipient merge variables, which override global merge variables with the same name.'),
        tags: z.array(z.string()).optional().describe('An array of strings to tag the message with.'),
        subaccount: z.string().optional().describe('The unique id of a subaccount for this message.'),
        google_analytics_domains: z
            .array(z.string())
            .optional()
            .describe('An array of strings indicating for which any matching URLs will automatically have Google Analytics parameters appended.'),
        google_analytics_campaign: z.string().optional().describe('The name of the Google Analytics campaign to use.'),
        attachments: z
            .array(
                z.object({
                    type: z.string().describe('The MIME type of the attachment.'),
                    name: z.string().describe('The file name of the attachment.'),
                    content: z.string().describe('The content of the attachment as a base64-encoded string.')
                })
            )
            .optional()
            .describe('An array of file attachments.'),
        images: z
            .array(
                z.object({
                    type: z.string().describe('The MIME type of the image.'),
                    name: z.string().describe('The Content-ID of the image.'),
                    content: z.string().describe('The content of the image as a base64-encoded string.')
                })
            )
            .optional()
            .describe('An array of inline images.')
    })
    .passthrough();

const InputSchema = z.object({
    template_name: z.string().describe("The immutable slug of a template that exists in the user's account."),
    template_content: z.array(TemplateContentSchema).describe('An array of template content to send.').default([]),
    message: MessageInputSchema,
    async: z.boolean().optional().describe('Enable a background sending mode that is optimized for bulk sending.'),
    ip_pool: z.string().optional().describe('The name of the dedicated IP pool that should be used to send the message.'),
    send_at: z.string().optional().describe('When this message should be sent as a UTC timestamp in YYYY-MM-DD HH:MM:SS format.')
});

const SendResultSchema = z.object({
    email: z.string(),
    status: z.enum(['sent', 'queued', 'scheduled', 'rejected', 'invalid']),
    reject_reason: z.string().optional().nullable(),
    queued_reason: z.string().optional().nullable(),
    _id: z.string().describe("The message's unique id.")
});

const OutputSchema = z.object({
    results: z.array(SendResultSchema).describe('Array of send results, one per recipient.')
});

const action = createAction({
    description: 'Send a transactional email rendered from a stored Mailchimp template.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            template_name: input.template_name,
            template_content: input.template_content,
            message: input.message
        };

        if (input.async !== undefined) {
            body['async'] = input.async;
        }
        if (input.ip_pool !== undefined) {
            body['ip_pool'] = input.ip_pool;
        }
        if (input.send_at !== undefined) {
            body['send_at'] = input.send_at;
        }

        // https://mailchimp.com/developer/transactional/api/messages/send-using-message-template/
        const response = await nango.post({
            endpoint: '/1.0/messages/send-template',
            data: body,
            retries: 3
        });

        const rawData = response.data;
        if (!Array.isArray(rawData)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected an array response from the provider.',
                response_type: typeof rawData
            });
        }

        const results = rawData.map((item: unknown) => {
            const parsed = SendResultSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'unexpected_response',
                    message: 'Provider returned an unexpected result shape.',
                    error: parsed.error.message
                });
            }
            return parsed.data;
        });

        return { results };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
