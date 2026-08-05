import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    form_id: z.union([z.string(), z.number()]).describe('Form ID to delete. Example: "72983"')
});

const ProviderFormSchema = z
    .object({
        id: z.number(),
        uuid: z.string().nullable(),
        name: z.string(),
        timezone: z.string(),
        redirect_url: z.string().nullable(),
        use_ajax: z.boolean(),
        notification_emails: z.string(),
        autoreply: z.boolean(),
        autoreply_body: z.string().nullable(),
        whitelist_source_domains: z.string().nullable(),
        force_recaptcha: z.boolean(),
        force_hcaptcha: z.boolean(),
        force_turnstile: z.boolean(),
        turnstile_site_key: z.string().nullable(),
        turnstile_secret: z.string().nullable(),
        notification_cc_emails: z.string().nullable().optional(),
        notification_bcc_emails: z.string().nullable().optional(),
        notification_subject: z.string().nullable().optional(),
        notification_from_name: z.string().nullable().optional(),
        autoreply_subject: z.string().nullable().optional(),
        autoreply_from_name: z.string().nullable().optional(),
        autoreply_greeting: z.string().nullable().optional(),
        autoreply_name: z.string().nullable().optional(),
        autoreply_title: z.string().nullable().optional(),
        autoreply_email: z.string().nullable().optional(),
        logo: z.string().nullable(),
        button_background_color: z.string().nullable().optional(),
        button_text_color: z.string().nullable().optional(),
        data_receipt_email: z.boolean(),
        retention_days: z.number(),
        hide_dashboard_button: z.boolean(),
        exclude_submitter_from_reply: z.boolean(),
        custom_template: z.string().nullable(),
        use_custom_template: z.boolean(),
        autoreply_custom_template: z.string().nullable(),
        autoreply_use_custom_template: z.boolean(),
        notification_mail_template_id: z.number().nullable(),
        auto_response_mail_template_id: z.number().nullable(),
        confirmation_mail_template_id: z.number().nullable(),
        honeypot_field: z.string().nullable(),
        recaptcha_failed_url: z.string().nullable(),
        domain_id: z.number().nullable(),
        domain_email: z.string().nullable(),
        duplicate_filter: z.boolean(),
        project_id: z.number(),
        redirect_heading: z.string().nullable().optional(),
        redirect_message: z.string().nullable().optional(),
        redirect_button_background_color: z.string().nullable().optional(),
        redirect_button_text: z.string().nullable().optional(),
        redirect_button_text_color: z.string().nullable().optional(),
        content_blacklist: z.array(z.unknown()).nullable(),
        allowed_domains: z.array(z.unknown()).nullable(),
        blocked_domains: z.array(z.unknown()).nullable(),
        smtp_email_validation: z.boolean(),
        contribute_to_spam_training: z.boolean(),
        created_at: z.string(),
        updated_at: z.string(),
        project_name: z.string().nullable().optional(),
        form_webhooks: z.array(z.unknown()).nullable(),
        inbox_count: z.number(),
        spam_count: z.number(),
        trash_count: z.number()
    })
    .passthrough();

const OutputSchema = ProviderFormSchema;

const action = createAction({
    description: 'Delete a form.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: `/v1/forms/${encodeURIComponent(String(input.form_id))}`,
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Form not found',
                form_id: String(input.form_id)
            });
        }

        const providerForm = ProviderFormSchema.parse(response.data);
        return providerForm;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
