import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().optional().describe('A friendly name for the webhook.'),
    topic: z.string().describe('Webhook topic. Example: "order.updated"'),
    delivery_url: z.string().describe('The URL where the webhook payload is delivered. Example: "https://example.com/webhook"'),
    status: z.enum(['active', 'paused', 'disabled']).optional().describe('Webhook status. Default is "active".'),
    secret: z.string().optional().describe('Secret key used to generate a hash of the delivered webhook.')
});

const ProviderWebhookSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    topic: z.string().nullable().optional(),
    resource: z.string().nullable().optional(),
    event: z.string().nullable().optional(),
    hooks: z.array(z.string()).nullable().optional(),
    delivery_url: z.string().nullable().optional(),
    secret: z.string().nullable().optional(),
    date_created: z.string().nullable().optional(),
    date_created_gmt: z.string().nullable().optional(),
    date_modified: z.string().nullable().optional(),
    date_modified_gmt: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    status: z.string().optional(),
    topic: z.string().optional(),
    resource: z.string().optional(),
    event: z.string().optional(),
    hooks: z.array(z.string()).optional(),
    delivery_url: z.string().optional(),
    secret: z.string().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    date_modified: z.string().optional(),
    date_modified_gmt: z.string().optional()
});

const action = createAction({
    description: 'Create a webhook in WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-webhook',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#create-a-webhook
            endpoint: '/wp-json/wc/v3/webhooks',
            data: {
                ...(input.name !== undefined && { name: input.name }),
                topic: input.topic,
                delivery_url: input.delivery_url,
                ...(input.status !== undefined && { status: input.status }),
                ...(input.secret !== undefined && { secret: input.secret })
            },
            retries: 10
        });

        const providerWebhook = ProviderWebhookSchema.parse(response.data);

        return {
            id: providerWebhook.id,
            ...(providerWebhook.name != null && { name: providerWebhook.name }),
            ...(providerWebhook.status != null && { status: providerWebhook.status }),
            ...(providerWebhook.topic != null && { topic: providerWebhook.topic }),
            ...(providerWebhook.resource != null && { resource: providerWebhook.resource }),
            ...(providerWebhook.event != null && { event: providerWebhook.event }),
            ...(providerWebhook.hooks != null && { hooks: providerWebhook.hooks }),
            ...(providerWebhook.delivery_url != null && { delivery_url: providerWebhook.delivery_url }),
            ...(providerWebhook.secret != null && { secret: providerWebhook.secret }),
            ...(providerWebhook.date_created != null && { date_created: providerWebhook.date_created }),
            ...(providerWebhook.date_created_gmt != null && { date_created_gmt: providerWebhook.date_created_gmt }),
            ...(providerWebhook.date_modified != null && { date_modified: providerWebhook.date_modified }),
            ...(providerWebhook.date_modified_gmt != null && { date_modified_gmt: providerWebhook.date_modified_gmt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
