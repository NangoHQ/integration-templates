import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    form_id: z.number().int().positive().describe('Form ID to attach the webhook to. Example: 72983'),
    name: z.string().describe('Webhook name. Example: "Nango Registry Test Webhook"'),
    url: z.string().describe('Webhook URL. Example: "https://example.com/webhook"'),
    format: z.enum(['json', 'slack']).describe('Webhook format. Use "json" or "slack". Example: "json"'),
    enabled: z.boolean().describe('Whether the webhook is enabled. Example: true')
});

const ProviderWebhookSchema = z.object({
    id: z.number(),
    form_id: z.number(),
    name: z.string(),
    url: z.string(),
    format: z.string(),
    enabled: z.boolean(),
    trigger_when_spam: z.boolean().optional(),
    signing_secret: z.string(),
    failure_count: z.number().optional(),
    last_failure_at: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    form_id: z.number(),
    name: z.string(),
    url: z.string(),
    format: z.string(),
    enabled: z.boolean(),
    trigger_when_spam: z.boolean().optional(),
    signing_secret: z.string(),
    failure_count: z.number().optional(),
    last_failure_at: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Create a new webhook on a form.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: 'v1/form_webhooks/',
            data: {
                form_id: input.form_id,
                name: input.name,
                url: input.url,
                format: input.format,
                enabled: input.enabled
            },
            // Non-idempotent: a retry after a timeout could create a duplicate webhook.
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create form webhook: empty response'
            });
        }

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            id: providerWebhook.id,
            form_id: providerWebhook.form_id,
            name: providerWebhook.name,
            url: providerWebhook.url,
            format: providerWebhook.format,
            enabled: providerWebhook.enabled,
            ...(providerWebhook.trigger_when_spam !== undefined && { trigger_when_spam: providerWebhook.trigger_when_spam }),
            signing_secret: providerWebhook.signing_secret,
            ...(providerWebhook.failure_count !== undefined && { failure_count: providerWebhook.failure_count }),
            ...(providerWebhook.last_failure_at != null && { last_failure_at: providerWebhook.last_failure_at }),
            ...(providerWebhook.created_at !== undefined && { created_at: providerWebhook.created_at }),
            ...(providerWebhook.updated_at !== undefined && { updated_at: providerWebhook.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
