import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Form name. Example: "My Form"'),
    project_id: z.number().int().positive().describe('Project ID to associate the form with. Example: 59242')
});

const ProviderFormWebhookSchema = z
    .object({
        id: z.number(),
        form_id: z.number(),
        name: z.string(),
        url: z.string(),
        format: z.string(),
        enabled: z.boolean(),
        trigger_when_spam: z.boolean().optional(),
        signing_secret: z.string().optional(),
        failure_count: z.number().optional(),
        last_failure_at: z.string().nullable().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const ProviderFormSchema = z.object({
    id: z.number(),
    uuid: z.string().nullish(),
    name: z.string(),
    timezone: z.string(),
    redirect_url: z.string().nullish(),
    use_ajax: z.boolean(),
    notification_emails: z.string(),
    autoreply: z.boolean(),
    autoreply_body: z.string().nullish(),
    whitelist_source_domains: z.string().nullish(),
    force_recaptcha: z.boolean(),
    force_hcaptcha: z.boolean(),
    force_turnstile: z.boolean(),
    turnstile_site_key: z.string().nullish(),
    turnstile_secret: z.string().nullish(),
    notification_cc_emails: z.string().nullish(),
    notification_bcc_emails: z.string().nullish(),
    notification_subject: z.string().nullish(),
    notification_from_name: z.string().nullish(),
    autoreply_subject: z.string().nullish(),
    autoreply_from_name: z.string().nullish(),
    autoreply_greeting: z.string().nullish(),
    autoreply_name: z.string().nullish(),
    autoreply_title: z.string().nullish(),
    autoreply_email: z.string().nullish(),
    logo: z.string().nullish(),
    button_background_color: z.string().nullish(),
    button_text_color: z.string().nullish(),
    data_receipt_email: z.boolean(),
    retention_days: z.number(),
    hide_dashboard_button: z.boolean(),
    exclude_submitter_from_reply: z.boolean(),
    custom_template: z.string().nullish(),
    use_custom_template: z.boolean(),
    autoreply_custom_template: z.string().nullish(),
    autoreply_use_custom_template: z.boolean(),
    notification_mail_template_id: z.number().nullish(),
    auto_response_mail_template_id: z.number().nullish(),
    confirmation_mail_template_id: z.number().nullish(),
    honeypot_field: z.string().nullish(),
    recaptcha_failed_url: z.string().nullish(),
    domain_id: z.number().nullish(),
    domain_email: z.string().nullish(),
    duplicate_filter: z.boolean(),
    project_id: z.number(),
    redirect_heading: z.string().nullish(),
    redirect_message: z.string().nullish(),
    redirect_button_background_color: z.string().nullish(),
    redirect_button_text: z.string().nullish(),
    redirect_button_text_color: z.string().nullish(),
    content_blacklist: z.array(z.unknown()).nullish(),
    allowed_domains: z.array(z.unknown()).nullish(),
    blocked_domains: z.array(z.unknown()).nullish(),
    smtp_email_validation: z.boolean(),
    contribute_to_spam_training: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    project_name: z.string(),
    form_webhooks: z.array(ProviderFormWebhookSchema),
    inbox_count: z.number(),
    spam_count: z.number(),
    trash_count: z.number()
});

const OutputSchema = ProviderFormSchema;

const action = createAction({
    description: 'Create a new form.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: 'v1/forms/',
            data: {
                name: input.name,
                project_id: input.project_id
            },
            // Non-idempotent: a retry after a timeout could create a duplicate form.
            retries: 1
        });

        return ProviderFormSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
