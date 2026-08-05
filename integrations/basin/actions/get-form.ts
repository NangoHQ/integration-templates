import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    form_id: z.number().describe('Form ID. Example: 72983')
});

const ProviderFormSchema = z
    .object({
        id: z.number(),
        uuid: z.string(),
        name: z.string(),
        timezone: z.string().optional(),
        redirect_url: z.string().nullable().optional(),
        use_ajax: z.boolean().optional(),
        notification_emails: z.string().optional(),
        notification_cc_emails: z.string().optional(),
        notification_bcc_emails: z.string().optional(),
        autoreply: z.boolean().optional(),
        autoreply_body: z.string().nullable().optional(),
        autoreply_subject: z.string().optional(),
        autoreply_from_name: z.string().optional(),
        force_recaptcha: z.boolean().optional(),
        force_hcaptcha: z.boolean().optional(),
        force_turnstile: z.boolean().optional(),
        retention_days: z.number().nullable().optional(),
        project_id: z.number().nullable().optional(),
        project_name: z.string().nullable().optional(),
        form_webhooks: z.array(z.object({}).passthrough()).optional(),
        inbox_count: z.number().optional(),
        spam_count: z.number().optional(),
        trash_count: z.number().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = ProviderFormSchema;

const action = createAction({
    description: 'Get a single form by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: `/v1/forms/${encodeURIComponent(input.form_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Form not found',
                form_id: input.form_id
            });
        }

        const providerForm = ProviderFormSchema.parse(response.data);

        return providerForm;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
