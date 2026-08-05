import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Form ID. Example: 73320'),
    name: z.string().optional(),
    redirect_url: z.string().nullable().optional(),
    project_id: z.number().optional(),
    notification_emails: z.string().optional(),
    autoreply: z.boolean().optional(),
    honeypot_field: z.string().nullable().optional(),
    recaptcha_failed_url: z.string().nullable().optional(),
    force_recaptcha: z.boolean().optional(),
    retention_days: z.number().optional(),
    domain_id: z.number().nullable().optional(),
    duplicate_filter: z.boolean().optional()
});

const ProviderFormSchema = z
    .object({
        id: z.number(),
        uuid: z.string().optional(),
        name: z.string().optional(),
        timezone: z.string().optional(),
        redirect_url: z.string().nullable().optional(),
        use_ajax: z.boolean().optional(),
        notification_emails: z.string().optional(),
        autoreply: z.boolean().optional(),
        autoreply_body: z.string().nullable().optional(),
        force_recaptcha: z.boolean().optional(),
        force_hcaptcha: z.boolean().optional(),
        force_turnstile: z.boolean().optional(),
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
        logo: z.string().nullable().optional(),
        button_background_color: z.string().nullable().optional(),
        button_text_color: z.string().nullable().optional(),
        data_receipt_email: z.boolean().optional(),
        retention_days: z.number().optional(),
        hide_dashboard_button: z.boolean().optional(),
        exclude_submitter_from_reply: z.boolean().optional(),
        custom_template: z.string().nullable().optional(),
        use_custom_template: z.boolean().optional(),
        autoreply_custom_template: z.string().nullable().optional(),
        autoreply_use_custom_template: z.boolean().optional(),
        notification_mail_template_id: z.number().nullable().optional(),
        auto_response_mail_template_id: z.number().nullable().optional(),
        confirmation_mail_template_id: z.number().nullable().optional(),
        honeypot_field: z.string().nullable().optional(),
        recaptcha_failed_url: z.string().nullable().optional(),
        domain_id: z.number().nullable().optional(),
        domain_email: z.string().nullable().optional(),
        duplicate_filter: z.boolean().optional(),
        project_id: z.number().optional(),
        redirect_heading: z.string().nullable().optional(),
        redirect_message: z.string().nullable().optional(),
        redirect_button_background_color: z.string().nullable().optional(),
        redirect_button_text: z.string().nullable().optional(),
        redirect_button_text_color: z.string().nullable().optional(),
        smtp_email_validation: z.boolean().optional(),
        contribute_to_spam_training: z.boolean().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        project_name: z.string().optional(),
        form_webhooks: z.array(z.unknown()).optional(),
        inbox_count: z.number().optional(),
        spam_count: z.number().optional(),
        trash_count: z.number().optional()
    })
    .passthrough();

const OutputSchema = ProviderFormSchema;

const action = createAction({
    description: 'Update fields on an existing form.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const formId = String(input.id);
        const data: Record<string, string | number | boolean | null | undefined> = {};

        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.redirect_url !== undefined) {
            data['redirect_url'] = input.redirect_url;
        }
        if (input.project_id !== undefined) {
            data['project_id'] = input.project_id;
        }
        if (input.notification_emails !== undefined) {
            data['notification_emails'] = input.notification_emails;
        }
        if (input.autoreply !== undefined) {
            data['autoreply'] = input.autoreply;
        }
        if (input.honeypot_field !== undefined) {
            data['honeypot_field'] = input.honeypot_field;
        }
        if (input.recaptcha_failed_url !== undefined) {
            data['recaptcha_failed_url'] = input.recaptcha_failed_url;
        }
        if (input.force_recaptcha !== undefined) {
            data['force_recaptcha'] = input.force_recaptcha;
        }
        if (input.retention_days !== undefined) {
            data['retention_days'] = input.retention_days;
        }
        if (input.domain_id !== undefined) {
            data['domain_id'] = input.domain_id;
        }
        if (input.duplicate_filter !== undefined) {
            data['duplicate_filter'] = input.duplicate_filter;
        }

        const config: ProxyConfiguration = {
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: `v1/forms/${encodeURIComponent(formId)}`,
            data,
            retries: 3
        };
        const response = await nango.put(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Form not found or update failed',
                form_id: input.id
            });
        }

        const providerForm = ProviderFormSchema.parse(response.data);

        return providerForm;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
