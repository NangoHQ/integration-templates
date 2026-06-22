import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The webhook UUID string. Example: "13f9cf11-cc5b-4e6d-830c-a858f45cf792"')
});

const ProviderWebhookSchema = z.object({
    id: z.number(),
    webhook_id: z.string(),
    url: z.string(),
    active: z.boolean(),
    events: z.array(z.string()),
    token: z.string().optional(),
    created_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    webhook: ProviderWebhookSchema
});

const OutputSchema = z.object({
    id: z.number(),
    webhook_id: z.string(),
    url: z.string(),
    active: z.boolean(),
    events: z.array(z.string()),
    token: z.string().optional(),
    created_at: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single webhook from Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.aircall.io/api-references/#webhooks
            endpoint: `/v1/webhooks/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerWebhook = providerResponse.webhook;

        return {
            id: providerWebhook.id,
            webhook_id: providerWebhook.webhook_id,
            url: providerWebhook.url,
            active: providerWebhook.active,
            events: providerWebhook.events,
            ...(providerWebhook.token !== undefined && { token: providerWebhook.token }),
            ...(providerWebhook.created_at !== undefined && { created_at: providerWebhook.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
