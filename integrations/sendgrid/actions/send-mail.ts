import { z } from 'zod';
import { createAction } from 'nango';

const EmailAddressSchema = z.object({
    email: z.string().email(),
    name: z.string().optional()
});

const PersonalizationSchema = z.object({
    to: z.array(EmailAddressSchema).min(1),
    cc: z.array(EmailAddressSchema).optional(),
    bcc: z.array(EmailAddressSchema).optional(),
    subject: z.string().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    substitutions: z.record(z.string(), z.string()).optional(),
    custom_args: z.record(z.string(), z.string()).optional(),
    send_at: z.number().optional(),
    dynamic_template_data: z.record(z.string(), z.unknown()).optional()
});

const ContentSchema = z.object({
    type: z.string(),
    value: z.string()
});

const AttachmentSchema = z.object({
    content: z.string(),
    filename: z.string(),
    type: z.string().optional(),
    disposition: z.string().optional(),
    content_id: z.string().optional()
});

const AsmSchema = z.object({
    group_id: z.number(),
    groups_to_display: z.array(z.number()).optional()
});

const MailSettingsSchema = z.object({
    bcc: z.object({ email: z.string().email(), enable: z.boolean().optional() }).optional(),
    bypass_list_management: z.object({ enable: z.boolean().optional() }).optional(),
    bypass_unsubscribe_management: z.object({ enable: z.boolean().optional() }).optional(),
    footer: z.object({ enable: z.boolean().optional(), text: z.string().optional(), html: z.string().optional() }).optional(),
    sandbox_mode: z.object({ enable: z.boolean().optional() }).optional(),
    spam_check: z.object({ enable: z.boolean().optional(), threshold: z.number().optional(), post_to_url: z.string().optional() }).optional()
});

const TrackingSettingsSchema = z.object({
    click_tracking: z.object({ enable: z.boolean().optional(), enable_text: z.boolean().optional() }).optional(),
    open_tracking: z.object({ enable: z.boolean().optional(), substitution_tag: z.string().optional() }).optional(),
    subscription_tracking: z
        .object({
            enable: z.boolean().optional(),
            text: z.string().optional(),
            html: z.string().optional(),
            substitution_tag: z.string().optional()
        })
        .optional(),
    ganalytics: z
        .object({
            enable: z.boolean().optional(),
            utm_source: z.string().optional(),
            utm_medium: z.string().optional(),
            utm_term: z.string().optional(),
            utm_content: z.string().optional(),
            utm_campaign: z.string().optional()
        })
        .optional()
});

const InputSchema = z.object({
    personalizations: z.array(PersonalizationSchema).min(1),
    from: EmailAddressSchema,
    reply_to: EmailAddressSchema.optional(),
    reply_to_list: z.array(EmailAddressSchema).optional(),
    subject: z.string().optional(),
    content: z.array(ContentSchema).optional(),
    attachments: z.array(AttachmentSchema).optional(),
    template_id: z.string().optional(),
    sections: z.record(z.string(), z.string()).optional(),
    headers: z.record(z.string(), z.string()).optional(),
    categories: z.array(z.string()).optional(),
    custom_args: z.record(z.string(), z.string()).optional(),
    send_at: z.number().optional(),
    batch_id: z.string().optional(),
    asm: AsmSchema.optional(),
    ip_pool_name: z.string().optional(),
    mail_settings: MailSettingsSchema.optional(),
    tracking_settings: TrackingSettingsSchema.optional()
});

const OutputSchema = z.object({
    accepted: z.boolean(),
    message_id: z.string().optional()
});

const action = createAction({
    description: 'Send an email.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['mail.send'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send
            endpoint: '/v3/mail/send',
            data: input,
            retries: 3
        });

        let messageId: string | undefined;
        if (response.headers && typeof response.headers === 'object' && !Array.isArray(response.headers)) {
            const val = response.headers['x-message-id'] || response.headers['X-Message-Id'];
            if (typeof val === 'string') {
                messageId = val;
            }
        }

        return {
            accepted: response.status === 200 || response.status === 202,
            message_id: messageId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
