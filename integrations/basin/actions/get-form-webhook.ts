import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    webhook_id: z.number().int().positive().describe('Form webhook ID. Example: 10113')
});

const ProviderFormWebhookSchema = z.object({
    id: z.number(),
    form_id: z.number(),
    name: z.string(),
    url: z.string(),
    format: z.string(),
    trigger_when_spam: z.boolean(),
    enabled: z.boolean(),
    failure_count: z.number(),
    last_failure_at: z.string().nullable().optional(),
    signing_secret: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    form_id: z.number(),
    name: z.string(),
    url: z.string(),
    format: z.string(),
    trigger_when_spam: z.boolean(),
    enabled: z.boolean(),
    failure_count: z.number(),
    last_failure_at: z.string().optional(),
    signing_secret: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Get a single form webhook by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: `v1/form_webhooks/${encodeURIComponent(String(input.webhook_id))}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Form webhook not found',
                webhook_id: input.webhook_id
            });
        }

        const providerWebhook = ProviderFormWebhookSchema.parse(response.data);

        return {
            id: providerWebhook.id,
            form_id: providerWebhook.form_id,
            name: providerWebhook.name,
            url: providerWebhook.url,
            format: providerWebhook.format,
            trigger_when_spam: providerWebhook.trigger_when_spam,
            enabled: providerWebhook.enabled,
            failure_count: providerWebhook.failure_count,
            ...(providerWebhook.last_failure_at != null && { last_failure_at: providerWebhook.last_failure_at }),
            ...(providerWebhook.signing_secret != null && { signing_secret: providerWebhook.signing_secret }),
            ...(providerWebhook.created_at != null && { created_at: providerWebhook.created_at }),
            ...(providerWebhook.updated_at != null && { updated_at: providerWebhook.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
